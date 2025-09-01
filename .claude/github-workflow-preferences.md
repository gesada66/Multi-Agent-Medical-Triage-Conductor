# GitHub Workflow Preferences

This file documents the user's preferred workflow for GitHub operations when working with Claude Code.

## 🔄 **Preferred GitHub Push & Sync Workflow**

### **User Preference**: Claude should handle git operations directly through chat using Bash tool

### **Standard Workflow Steps:**

1. **Check Status First**
   ```bash
   git status
   ```
   - Always check current repository state before making changes
   - Identify untracked files and modifications

2. **Add Files**
   ```bash
   git add .                    # For all files
   # OR
   git add specific-file.md     # For specific files
   ```

3. **Create Comprehensive Commit**
   ```bash
   git commit -m "Title: Brief description

   Detailed description with bullet points:
   - Key change 1
   - Key change 2 
   - Key change 3

   🤖 Generated with Claude Code

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

4. **Push to Remote**
   ```bash
   git push origin main         # or master
   # OR for initial push:
   git push -u origin main
   ```

5. **Confirm Success**
   - Verify successful push completion
   - Check that remote repository is synchronized

## 📝 **Commit Message Guidelines**

### **Format Template:**
```
[Brief Title - What was accomplished]

[Detailed description explaining the changes and impact]

Key Changes:
- Bullet point 1
- Bullet point 2
- Bullet point 3

[Optional: Technical details, file counts, impact summary]

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **Style Preferences:**
- ✅ **Comprehensive descriptions** explaining what and why
- ✅ **Bullet points** for key changes and features
- ✅ **Impact summaries** when significant changes are made
- ✅ **File counts** when many files are changed
- ✅ **Claude Code attribution** footer on all commits
- ✅ **Professional tone** suitable for technical collaboration

## 🛠️ **Technical Preferences**

### **Development Focus Areas:**
- Backend and agent development priority
- AI-generated medical logic implementation
- Cost optimization with prompt caching and batching
- Comprehensive testing frameworks
- Revolutionary moonshot feature documentation

### **Testing Approach:**
- Feature-by-feature development with full test suite validation
- All tests must pass before proceeding to next feature
- Comprehensive testing pipeline: lint → typecheck → unit → integration → e2e → contract → perf

### **Documentation Style:**
- Comprehensive technical specifications
- Implementation details and architectural diagrams
- Code examples with TypeScript interfaces
- Research roadmaps and partnership strategies

## ⚙️ **Repository-Specific Notes**

### **Multi-Agent Medical Triage Conductor Project:**
- Focus on revolutionary healthcare AI features
- Moonshot documentation is high priority
- Include impact projections and research implications
- Maintain clinical safety and ethical considerations in all commits

### **Branch Strategy:**
- Direct pushes to main/master branch preferred
- Feature branches only for major architectural changes
- Immediate deployment of documentation updates

## 🔐 **WSL-Specific GitHub Authentication Process**

### **Initial Setup (One-time only):**
When working in WSL environment, follow these steps to establish persistent GitHub authentication:

1. **Store Token in ~/.bashrc**
   ```bash
   # Edit ~/.bashrc to add:
   export GITHUB_TOKEN=your_github_personal_access_token_here
   ```

2. **Reload Environment**
   ```bash
   source ~/.bashrc
   ```

3. **Verify Authentication**
   ```bash
   gh auth status
   ```

### **Authentication Troubleshooting:**
If `gh auth status` shows authentication failure:

1. **Clear existing invalid tokens**
   ```bash
   unset GITHUB_TOKEN
   gh auth logout --hostname github.com
   ```

2. **Re-authenticate with stored token**
   ```bash
   source ~/.bashrc  # Reload token from ~/.bashrc
   gh auth status    # Should now work automatically
   ```

### **Key WSL Authentication Facts:**
- ✅ **Environment Variable Method**: GitHub CLI automatically uses `GITHUB_TOKEN` when set
- ✅ **No Manual Login Needed**: `gh auth login --with-token` is NOT required
- ✅ **Persistent Across Sessions**: Token stored in `~/.bashrc` persists across WSL restarts
- ✅ **Automatic Detection**: GitHub CLI detects and uses environment token automatically

### **Git Credential Configuration:**
```bash
# Configure git to use GitHub CLI for authentication
gh auth setup-git
git config --global --replace-all credential.https://github.com.helper '!gh auth git-credential'
```

## 🚨 **Important Reminders**

1. **No Terminal Exit Required**: Claude can handle all git operations through Bash tool in chat
2. **Always Check Status First**: Understand current state before making changes
3. **Comprehensive Commits**: Explain what was done and why it matters
4. **Attribution Required**: Include Claude Code footer on all commits
5. **Push Confirmation**: Always verify successful sync with remote repository
6. **WSL Token Management**: Token is stored in `~/.bashrc` for persistent authentication

## 🔑 **Token Management for Future Sessions**

### **For Claude Code Agents:**
When starting a new Claude Code session in WSL:

1. **Automatic Token Loading**: Token is already stored in `~/.bashrc`
2. **Verification Command**: Run `gh auth status` to confirm authentication
3. **If Authentication Fails**: Run `source ~/.bashrc` and check again

### **Token Security Best Practices:**
- ✅ Token stored in user home directory with proper permissions
- ✅ Only accessible to your user account
- ✅ Automatically loaded in all new terminal sessions
- ✅ No need to re-enter token manually

### **For Future Claude Code Projects:**
This authentication setup works across all repositories and projects in WSL environment. Future Claude Code agents can:
- Access GitHub operations immediately
- Use `gh` CLI commands without additional setup
- Perform git operations with remote repositories
- Handle PR creation, issues, and repository management

---

**Last Updated**: January 2025  
**Applies to**: All repositories when working with Claude Code in WSL  
**Authentication Status**: ✅ Persistent Token Storage Configured  
**Workflow Status**: ✅ Active and Preferred