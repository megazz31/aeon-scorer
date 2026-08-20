param(
  [ValidateSet('menu','run','update','check','benchmark')]
  [string]$Mode = 'menu'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location $PSScriptRoot

function Write-Title {
  Clear-Host
  Write-Host '============================================' -ForegroundColor DarkMagenta
  Write-Host '             AEON SCORER v3.1' -ForegroundColor Magenta
  Write-Host '============================================' -ForegroundColor DarkMagenta
  Write-Host ''
}

function Require-Command([string]$Name, [string]$Hint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name est introuvable. $Hint"
  }
}

function Run-Step([string]$Label, [scriptblock]$Action) {
  Write-Host "`n> $Label" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "$Label a échoué (code $LASTEXITCODE)." }
}

function Ensure-Environment {
  Require-Command 'node' 'Installe Node.js 22 LTS puis relance ce script.'
  Require-Command 'npm' 'npm doit être installé avec Node.js.'
  Write-Host "Node: $(node -v)" -ForegroundColor DarkGray
  Write-Host "npm : $(npm -v)" -ForegroundColor DarkGray
}

function Ensure-Dependencies {
  $needsInstall = -not (Test-Path 'node_modules')
  if (-not $needsInstall -and (Test-Path 'package-lock.json')) {
    $lock = (Get-Item 'package-lock.json').LastWriteTimeUtc
    $modules = (Get-Item 'node_modules').LastWriteTimeUtc
    $needsInstall = $lock -gt $modules
  }
  if ($needsInstall) {
    Run-Step 'Installation des dépendances' { npm install --no-audit --no-fund }
  } else {
    Write-Host '> Dépendances déjà installées.' -ForegroundColor Green
  }
}

function Update-Project {
  Require-Command 'git' 'Installe Git for Windows ou utilise le mode Lancer sans mise à jour.'
  Run-Step 'Mise à jour Git (fast-forward uniquement)' { git pull --ff-only }
  Run-Step 'Synchronisation des dépendances' { npm install --no-audit --no-fund }
}

function Check-Project {
  Run-Step 'Smoke test' { npm run smoke }
  Run-Step 'Tests sémantiques' { npm run test:semantic }
  Run-Step 'Tests métamorphiques' { npm run test:metamorphic }
  Run-Step 'Audit adversarial' { npm run audit }
  Run-Step 'Build production' { npm run build }
  Write-Host "`nTous les contrôles locaux sont OK." -ForegroundColor Green
}

function Start-App {
  Ensure-Environment
  Ensure-Dependencies
  Write-Host "`nAeon Scorer va démarrer. Garde cette fenêtre ouverte." -ForegroundColor Green
  Write-Host 'Le navigateur utilise normalement http://localhost:5173' -ForegroundColor DarkGray
  Write-Host ''
  npm run dev
}

function Run-Benchmark {
  Ensure-Environment
  Ensure-Dependencies
  Write-Host "`nLe benchmark complet utilise Internet et peut prendre plusieurs minutes." -ForegroundColor Yellow
  Run-Step 'Benchmark complet' { npm run benchmark }
}

function Execute-Mode([string]$SelectedMode) {
  Write-Title
  Ensure-Environment
  switch ($SelectedMode) {
    'run' {
      Ensure-Dependencies
      Start-App
    }
    'update' {
      Update-Project
      Check-Project
      Start-App
    }
    'check' {
      Ensure-Dependencies
      Check-Project
    }
    'benchmark' {
      Run-Benchmark
    }
  }
}

try {
  if ($Mode -ne 'menu') {
    Execute-Mode $Mode
    exit 0
  }

  while ($true) {
    Write-Title
    Write-Host '1  Lancer Aeon Scorer' -ForegroundColor White
    Write-Host '2  Mettre à jour + vérifier + lancer' -ForegroundColor White
    Write-Host '3  Vérifier le projet uniquement' -ForegroundColor White
    Write-Host '4  Lancer le benchmark complet' -ForegroundColor White
    Write-Host 'Q  Quitter' -ForegroundColor DarkGray
    Write-Host ''
    $choice = (Read-Host 'Choix').Trim().ToLowerInvariant()
    switch ($choice) {
      '1' { Execute-Mode 'run'; break }
      '2' { Execute-Mode 'update'; break }
      '3' { Execute-Mode 'check'; Write-Host ''; Read-Host 'Entrée pour revenir au menu' | Out-Null }
      '4' { Execute-Mode 'benchmark'; Write-Host ''; Read-Host 'Entrée pour revenir au menu' | Out-Null }
      'q' { exit 0 }
      default { Write-Host 'Choix invalide.' -ForegroundColor Yellow; Start-Sleep -Seconds 1 }
    }
  }
} catch {
  Write-Host "`nERREUR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'La fenêtre reste ouverte pour que tu puisses lire le message.' -ForegroundColor Yellow
  Read-Host 'Entrée pour fermer' | Out-Null
  exit 1
}
