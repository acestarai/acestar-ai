# Quick Start Guide - Push to IBM GitHub

## 🚀 Fast Setup (5 Minutes)

### Step 1: Create Repository on IBM GitHub
1. Go to **https://github.ibm.com**
2. Click **"+"** → **"New repository"**
3. Name: `ibm-recap`
4. Visibility: **Private**
5. Click **"Create repository"**

### Step 2: Push Your Code (Copy & Paste)

Open Terminal in your project folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit: IBM Recap application"

# Connect to your IBM GitHub repo (REPLACE YOUR_IBM_ID)
git remote add origin https://github.ibm.com/YOUR_IBM_ID/ibm-recap.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Done!** Your code is now on IBM GitHub with CI/CD pipeline active.

---

## 📝 Daily Updates - Three Easy Methods

### Method 1: Quick Script (Recommended)
```bash
# One command to commit and push everything
./scripts/auto-push.sh "Your commit message"

# Or with auto-generated message
./scripts/auto-push.sh
```

### Method 2: Standard Git Commands
```bash
git add .
git commit -m "Description of changes"
git push
```

### Method 3: VS Code
1. Click **Source Control** icon (left sidebar)
2. Click **"+"** to stage all changes
3. Type commit message
4. Click **✓ Commit**
5. Click **"..."** → **"Push"**

---

## 🔧 One-Time Setup for Easier Updates

### Save Your Credentials
```bash
git config --global credential.helper osxkeychain
git config --global user.email "your.email@ibm.com"
git config --global user.name "Your Name"
```

### Create Quick Alias
```bash
# Add to ~/.zshrc or ~/.bash_profile
alias gitsave='cd "/Users/asadmahmood/Documents/IBM 2026/Internal Productivity Apps/TeamsCallSummarizer-v2" && ./scripts/auto-push.sh'

# Reload shell
source ~/.zshrc  # or source ~/.bash_profile
```

Now you can just type `gitsave` from anywhere!

---

## ✅ Verify CI/CD Pipeline

After pushing:
1. Go to **https://github.ibm.com/YOUR_IBM_ID/ibm-recap**
2. Click **"Actions"** tab
3. See your pipeline running ✅

---

## 🆘 Troubleshooting

**Authentication Error?**
```bash
# Use Personal Access Token
# 1. Go to https://github.ibm.com/settings/tokens
# 2. Generate token with 'repo' scope
# 3. Use token as password
```

**Push Rejected?**
```bash
git pull --rebase origin main
git push
```

---

## 📚 Full Documentation

For detailed instructions, see **GITHUB_SETUP.md**

---

## 🎯 Summary

✅ Create repo on github.ibm.com  
✅ Run git commands to push  
✅ Use `./scripts/auto-push.sh` for updates  
✅ CI/CD runs automatically on every push  

**That's it! You're all set up.**