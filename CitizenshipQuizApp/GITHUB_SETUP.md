# GitHub Repository Setup Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in the details:
   - **Repository name**: `ai-citizen-quiz`
   - **Description**: `AI-powered US Citizenship test preparation app`
   - **Visibility**: Public (required for GitHub Pages)
   - **DO NOT** initialize with README, .gitignore, or license (you already have these)
3. Click "Create repository"

## Step 2: Push Your Code to GitHub

After creating the repository, GitHub will show you commands. Use these commands from your project directory:

```bash
cd /Users/bryanhurren/Documents/claude-test/CitizenshipQuizApp

# Add the remote repository (replace USERNAME with your GitHub username)
git remote add origin https://github.com/USERNAME/ai-citizen-quiz.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git push -u origin main
```

**Replace `USERNAME` with your actual GitHub username!**

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/USERNAME/ai-citizen-quiz`
2. Click "Settings" (top navigation)
3. Click "Pages" (left sidebar)
4. Under "Source":
   - Select branch: **main**
   - Select folder: **/ (root)**
5. Click "Save"
6. Wait 1-2 minutes for GitHub Pages to deploy

## Step 4: Get Your Privacy Policy URL

After GitHub Pages is enabled, your privacy policy will be available at:

```
https://USERNAME.github.io/ai-citizen-quiz/PRIVACY_POLICY
```

**Replace `USERNAME` with your actual GitHub username!**

This is the URL you'll use in App Store Connect.

## Step 5: Verify Privacy Policy is Accessible

1. Open your browser
2. Go to: `https://USERNAME.github.io/ai-citizen-quiz/PRIVACY_POLICY`
3. Verify the privacy policy displays correctly

## Troubleshooting

### "Permission denied" error when pushing

You may need to authenticate with GitHub. Options:

**Option 1: Personal Access Token (Recommended)**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (all)
4. Copy the token
5. When pushing, use token as password

**Option 2: SSH Key**
1. Follow: https://docs.github.com/en/authentication/connecting-to-github-with-ssh
2. Change remote URL:
   ```bash
   git remote set-url origin git@github.com:USERNAME/ai-citizen-quiz.git
   ```

### GitHub Pages not showing content

- Wait 2-5 minutes after enabling
- Check GitHub Actions tab for deployment status
- Ensure repository is public
- Try accessing with `.md` extension: `/PRIVACY_POLICY.md`

### Privacy policy URL returns 404

GitHub Pages may strip file extensions. Try both:
- `https://USERNAME.github.io/ai-citizen-quiz/PRIVACY_POLICY`
- `https://USERNAME.github.io/ai-citizen-quiz/PRIVACY_POLICY.md`

## Alternative: Using GitHub CLI

If you have GitHub CLI installed (`gh`):

```bash
# Create repository
gh repo create ai-citizen-quiz --public --source=. --remote=origin --push

# Enable GitHub Pages
gh api repos/:owner/ai-citizen-quiz/pages -X POST -f source[branch]=main -f source[path]=/
```

## Next Steps

After your privacy policy is live:

1. ✅ Copy the privacy policy URL
2. ✅ Update APP_STORE_SUBMISSION_GUIDE.md with your actual URL
3. ✅ Use this URL when setting up App Store Connect
4. ✅ Proceed with screenshot capture and app submission

---

**Privacy Policy URL Template:**
```
https://[YOUR-GITHUB-USERNAME].github.io/ai-citizen-quiz/PRIVACY_POLICY
```

Save this URL - you'll need it for App Store Connect!
