# ⚡ AeonScorer v2.0 — MTG Card Scoring Algorithm

Algorithme de scoring MTG à 3 couches pour évaluer automatiquement le "coût en points" de chaque carte Magic: The Gathering.

## 🎮 Fonctionnalités

- **120+ cartes** en base locale avec texte Oracle
- **25 combos** connus avec multiplicateurs (Tier S/A/B)
- **50+ regex patterns** pour l'analyse du texte Oracle
- **API Scryfall** live pour accéder aux 25000+ cartes MTG
- **3 couches de scoring** : Intrinsèque → Combos → Commandant
- **Deck builder** avec budget en temps réel

## 🚀 Déployer sur Vercel (5 minutes)

### Étape 1 : Créer un repo GitHub
1. Va sur [github.com/new](https://github.com/new)
2. Nom du repo : `aeon-scorer`
3. Public ou Private, comme tu veux
4. **Ne coche RIEN** (pas de README, pas de .gitignore)
5. Clique "Create repository"

### Étape 2 : Pousser le code
Dans ton terminal, depuis le dossier du projet :
```bash
cd aeon-scorer
git init
git add .
git commit -m "AeonScorer v2.0"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/aeon-scorer.git
git push -u origin main
```

### Étape 3 : Déployer sur Vercel
1. Va sur [vercel.com](https://vercel.com) et connecte-toi avec GitHub
2. Clique "Add New Project"
3. Importe le repo `aeon-scorer`
4. **Framework Preset** : Vite (devrait être auto-détecté)
5. Clique "Deploy"
6. Attends ~30 secondes → ton site est live !

### Étape 4 : C'est tout !
Vercel te donne une URL style `aeon-scorer.vercel.app`. Chaque push sur GitHub redéploie automatiquement.

## 🛠️ Développement local

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173

## 📐 Comment fonctionne l'algorithme

```
points = floor( rawScore × cmcMultiplier / 3 × cmdSynergyMult × comboMult )
```

### Couche 1 — Score Intrinsèque
50+ regex patterns analysent le texte Oracle (draw, exile, counter, tokens, +1/+1...).
Multiplicateur CMC : CMC 0 = ×2.5, CMC 1 = ×2.0, ..., CMC 7+ = ×0.7.

### Couche 2 — Combos
25 combos en base. Multiplicateur ×1.2 (synergie) à ×3.0 (win-con infini).

### Couche 3 — Commandant
Tags partagés entre commandant et carte = +15% par tag.

## 📝 License

MIT — Fais-en ce que tu veux !
