# Release Directory Structure

This directory contains all release-related documentation and notes for the Media Labs project.

## 📁 Directory Structure

```text
release/
├── docs/               # Release process documentation
│   ├── checklist.md           # Release preparation checklist
│   ├── deployment_guide.md    # Deployment procedures and platforms
│   ├── implementation.md      # Implementation details for release strategy
│   ├── protection_guide.md    # Branch protection and security guidelines
│   ├── quick_start.md         # Quick start guide for releases
│   └── strategy.md            # Comprehensive release strategy documentation
├── notes/              # Individual release notes
│   ├── v1.0.0.release.md     # Release notes for version 1.0.0
│   └── v1.1.0.release.md     # Release notes for version 1.1.0
└── README.md           # This file
```

## 📝 Release Notes Convention

All release notes follow the naming pattern: `{version}.release.md`

Examples:

- `v1.0.0.release.md` - Major release version 1.0.0
- `v1.1.0.release.md` - Minor release version 1.1.0
- `v1.0.1.release.md` - Patch release version 1.0.1
- `beta-1.release.md` - Beta release notes

## 📚 Documentation Categories

### `/docs` - Process Documentation

Contains all documentation related to implementing and managing release processes:

- **Strategy Documentation**: Comprehensive guides for release planning and implementation
- **Operational Guides**: Step-by-step procedures for executing releases
- **Security & Compliance**: Branch protection and approval workflows
- **Platform Integration**: Deployment guides for various hosting platforms

### `/notes` - Release Artifacts

Contains the actual release notes for each version:

- **Version History**: Complete record of all releases
- **Feature Summaries**: Detailed feature lists and improvements
- **Breaking Changes**: Documentation of API changes and migration guides
- **Bug Fixes**: List of resolved issues and improvements

## 🤖 AI Agent Integration

This directory structure is referenced in:

- `AGENTS.md` - AI agent guidance for release processes
- `.github/copilot-instructions.md` - GitHub Copilot configuration
- `.github/prompts/*.prompt.md` - Various automation prompts

## 🔄 Release Workflow

1. **Planning**: Consult `docs/strategy.md` for release planning
2. **Preparation**: Follow `docs/checklist.md` for pre-release tasks
3. **Execution**: Use `docs/deployment_guide.md` for deployment
4. **Documentation**: Generate release notes in `notes/{version}.release.md`
5. **Review**: Update process documentation as needed

## 📋 Quick Links

- [Release Strategy](docs/strategy.md) - Complete release strategy overview
- [Quick Start Guide](docs/quick_start.md) - Get started with releases
- [Release Checklist](docs/checklist.md) - Pre-release preparation
- [Branch Enforcement](docs/branch_enforcement.md) - Workflow enforcement rules
- [Latest Release Notes](notes/) - View recent releases
