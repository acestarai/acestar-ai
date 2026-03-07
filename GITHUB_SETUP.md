# IBM GitHub Repository Setup Guide

This guide will help you set up a private IBM GitHub repository with automatic CI/CD pipeline for IBM Recap.

## Prerequisites

1. **IBM GitHub Enterprise Account**: Access to github.ibm.com
2. **Git installed locally**: Check with `git --version`
3. **GitHub CLI (optional)**: For easier authentication

---

## Step 1: Create Private Repository on IBM GitHub

### Option A: Using GitHub Web Interface

1. Go to **https://github.ibm.com**
2. Log in with your IBM credentials
3. Click the **"+"** icon in the top right → **"New repository"**
4. Fill in the details:
   - **Repository name**: `ibm-recap` (or your preferred name)
   - **Description**: "IBM Recap - Meeting Recording & AI Summarization Tool"
   - **Visibility**: Select **Private**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
brew install gh

# Authenticate with IBM GitHub
gh auth login --hostname github.ibm.com

# Create private repository
gh repo create ibm-recap --private --source=. --remote=origin --push
```

---

## Step 2: Initialize Local Git Repository

Open Terminal in your project directory and run:

```bash
# Navigate to your project directory
cd "/Users/asadmahmood/Documents/IBM 2026/Internal Productivity Apps/TeamsCallSummarizer-v2"

# Initialize git repository (if not already initialized)
git init

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: IBM Recap application with AI summarization"

# Add remote repository (replace YOUR_IBM_ID with your IBM GitHub username)
git remote add origin https://github.ibm.com/YOUR_IBM_ID/ibm-recap.git

# Verify remote was added
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Configure Git for Automatic Updates

### Set up Git credentials (One-time setup)

```bash
# Configure your IBM email
git config --global user.email "your.email@ibm.com"

# Configure your name
git config --global user.name "Your Name"

# Store credentials (so you don't have to enter password every time)
git config --global credential.helper osxkeychain
```

### Create Git Aliases for Quick Updates (Optional but Recommended)

Add these to your `~/.gitconfig` or run these commands:

```bash
# Quick commit and push
git config --global alias.save '!git add -A && git commit -m "Auto-save: $(date)" && git push'

# Quick status check
git config --global alias.st 'status -sb'

# Quick log view
git config --global alias.lg "log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
```

---

## Step 4: Daily Workflow - Automatic Updates

### Method 1: Manual Git Commands (Recommended for Control)

Every time you make changes:

```bash
# Check what changed
git status

# Add all changes
git add .

# Commit with a descriptive message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

### Method 2: Quick Save (Using Alias)

If you set up the alias above:

```bash
# One command to add, commit, and push
git save
```

### Method 3: VS Code Git Integration

1. Open VS Code
2. Click the **Source Control** icon in the left sidebar (or press `Cmd+Shift+G`)
3. Review changes in the "Changes" section
4. Click **"+"** next to files to stage them (or stage all)
5. Enter a commit message in the text box
6. Click the **✓ Commit** button
7. Click **"..."** → **"Push"** to upload to GitHub

### Method 4: Automated Git Hooks (Advanced)

Create a post-commit hook to automatically push:

```bash
# Create the hook file
cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
echo "Auto-pushing to GitHub..."
git push origin main
EOF

# Make it executable
chmod +x .git/hooks/post-commit
```

Now every commit will automatically push to GitHub!

---

## Step 5: Verify CI/CD Pipeline

After your first push:

1. Go to your repository on **https://github.ibm.com/YOUR_IBM_ID/ibm-recap**
2. Click the **"Actions"** tab
3. You should see the CI/CD pipeline running
4. Click on the workflow run to see details
5. Green checkmark ✅ means success!

The pipeline will automatically run on every push to:
- Install dependencies
- Run tests (if configured)
- Build the application
- Archive artifacts

---

## Step 6: Branch Strategy (Optional but Recommended)

### Create Development Branch

```bash
# Create and switch to develop branch
git checkout -b develop

# Push develop branch to GitHub
git push -u origin develop
```

### Workflow with Branches

```bash
# Work on develop branch
git checkout develop

# Make changes, then commit
git add .
git commit -m "Add new feature"
git push

# When ready to release, merge to main
git checkout main
git merge develop
git push
```

---

## Quick Reference Commands

```bash
# Check status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub
git push

# Pull latest changes (if working on multiple machines)
git pull

# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD
```

---

## Troubleshooting

### Authentication Issues

If you get authentication errors:

```bash
# Use Personal Access Token
# 1. Go to https://github.ibm.com/settings/tokens
# 2. Generate new token with 'repo' scope
# 3. Use token as password when prompted

# Or use SSH instead of HTTPS
git remote set-url origin git@github.ibm.com:YOUR_IBM_ID/ibm-recap.git
```

### Push Rejected

If push is rejected:

```bash
# Pull latest changes first
git pull --rebase origin main

# Then push
git push
```

### Large Files

If you have large files (>100MB):

```bash
# Install Git LFS
brew install git-lfs
git lfs install

# Track large files
git lfs track "*.mp3"
git add .gitattributes
git commit -m "Add Git LFS tracking"
```

---

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use `.env.example`** for sharing configuration templates
3. **Rotate API keys** if accidentally committed
4. **Enable branch protection** on main branch (Settings → Branches)
5. **Require pull request reviews** for production changes

---

## Additional Resources

- **IBM GitHub Enterprise**: https://github.ibm.com
- **Git Documentation**: https://git-scm.com/doc
- **GitHub Actions**: https://docs.github.com/en/actions
- **IBM GitHub Support**: Contact your IBM GitHub administrator

---

## Summary

✅ Repository created on IBM GitHub  
✅ Local git initialized and connected  
✅ CI/CD pipeline configured  
✅ Automatic updates workflow established  

**Next Steps:**
1. Create the repository on github.ibm.com
2. Run the git commands to push your code
3. Verify the CI/CD pipeline runs successfully
4. Start using `git add . && git commit -m "message" && git push` for updates!