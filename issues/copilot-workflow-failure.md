## Issue: Copilot Workflow Failure

### Description:
The Copilot workflow has failed with the following git errors:
- **fatal:** ambiguous argument 'HEAD'
- **pathspec not matched**
- **missing refs**

### Recommended Solutions:
1. Add `actions/checkout@v4` with `fetch-depth: 0` to ensure all history is fetched.
2. Validate branch existence before checkout to avoid errors.
3. Handle detached HEAD state and avoid using fragile `rev-parse` commands.
4. Add a diagnostic `git status` step after checkout to better understand the state of the repository.

### Failing Job:
For more details, see the failing job: [Link to Job](https://github.com/MikeBlakeway/media-lab/actions/runs/17107204054/job/48519108447)