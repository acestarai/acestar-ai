#!/bin/bash

# IBM Recap - Automatic Git Push Script
# This script automatically commits and pushes changes to GitHub

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 IBM Recap - Auto Push to GitHub${NC}"
echo "=================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not a git repository${NC}"
    echo "Please run 'git init' first"
    exit 1
fi

# Check if there are any changes
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✅ No changes to commit${NC}"
    exit 0
fi

# Show status
echo -e "\n${YELLOW}📋 Changes detected:${NC}"
git status --short

# Add all changes
echo -e "\n${YELLOW}➕ Adding all changes...${NC}"
git add .

# Get commit message from user or use default
if [ -z "$1" ]; then
    COMMIT_MSG="Auto-update: $(date '+%Y-%m-%d %H:%M:%S')"
else
    COMMIT_MSG="$1"
fi

# Commit changes
echo -e "\n${YELLOW}💾 Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Commit failed${NC}"
    exit 1
fi

# Push to GitHub
echo -e "\n${YELLOW}🚀 Pushing to GitHub...${NC}"
git push

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Successfully pushed to GitHub!${NC}"
    echo -e "${GREEN}📦 Commit: $COMMIT_MSG${NC}"
    
    # Show the latest commit
    echo -e "\n${YELLOW}📝 Latest commit:${NC}"
    git log -1 --oneline
    
    echo -e "\n${GREEN}🎉 Done! Your changes are now on GitHub.${NC}"
else
    echo -e "\n${RED}❌ Push failed${NC}"
    echo "Please check your internet connection and GitHub credentials"
    exit 1
fi

# Made with Bob
