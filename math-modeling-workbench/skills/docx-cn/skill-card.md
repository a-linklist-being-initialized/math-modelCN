## Description: <br>
Docx Cn guides agents through creating, reading, editing, converting, validating, and analyzing Word .docx documents, including formatting, tables, images, comments, and tracked changes. <br>

This skill is ready for commercial/non-commercial use. <br>

## Publisher: <br>
[guohongbin-git](https://clawhub.ai/user/guohongbin-git) <br>

### License/Terms of Use: <br>
Anthropic Consumer or Commercial Terms of Service <br>


## Use Case: <br>
Developers and document-processing agents use this skill to create, read, convert, edit, validate, and analyze Microsoft Word .docx documents, including formatting, tables, images, comments, and tracked changes. <br>

### Deployment Geography for Use: <br>
Global <br>

## Known Risks and Mitigations: <br>
Risk: The security review reports under-contained native injection and persistent temporary LibreOffice automation. <br>
Mitigation: Review before installing, run only in an isolated workspace, and clear or protect /tmp/lo_socket_shim.so and /tmp/libreoffice_docx_profile. <br>
Risk: Processing untrusted Office files in shared environments can expose the host to document-processing and automation risks. <br>
Mitigation: Avoid processing untrusted Office files in a shared multi-user environment and prefer versions that use private per-run temporary directories, exact macro and shim verification, timeout failures, and pinned dependencies. <br>


## Reference(s): <br>
- [ClawHub skill page](https://clawhub.ai/guohongbin-git/docx-cn) <br>
- [OpenClaw homepage metadata](https://clawhub.com/skills/docx-cn) <br>


## Skill Output: <br>
**Output Type(s):** [text, markdown, code, shell commands, configuration, guidance] <br>
**Output Format:** [Markdown guidance with inline code and shell command examples] <br>
**Output Parameters:** [1D] <br>
**Other Properties Related to Output:** [May produce or modify .docx files through the bundled document-processing scripts when the agent executes the recommended commands.] <br>

## Skill Version(s): <br>
1.0.1 (source: server release metadata) <br>

## Ethical Considerations: <br>
Users should evaluate whether this skill is appropriate for their environment, review any generated or modified files before relying on them, and apply their organization's safety, security, and compliance requirements before deployment. <br>
