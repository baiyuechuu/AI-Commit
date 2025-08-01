import inquirer from "inquirer";
import ora from "ora";
import {
	PROVIDERS,
	COMMIT_STYLES,
	COMMIT_RULES,
	CONVENTIONAL_TYPES,
} from "./constants.js";

export class AIService {
	constructor(config) {
		this.config = config;
		this.spinner = null;
	}

	async getApiKey() {
		const provider = PROVIDERS[this.config.provider];
		let apiKey = process.env[provider.keyEnv];

		if (!apiKey) {
			const answers = await inquirer.prompt([
				{
					type: "password",
					name: "apiKey",
					message: `Enter your ${provider.name} API key:`,
					mask: "*",
				},
			]);
			apiKey = answers.apiKey;
		}

		return apiKey;
	}

	getCommitPrompt(changes, diff, context, userFeedback = "") {
		const styleConfig = COMMIT_STYLES[this.config.commitStyle];

		let systemPrompt = `You are a precision Git commit message generator with expert-level code analysis capabilities. Your primary objective is to generate commit messages that are 100% accurate to the actual changes made, with perfect type classification and scope identification.

## CRITICAL FORMATTING RULES:

### OUTPUT FORMAT:
- Return ONLY the commit message text
- DO NOT wrap in markdown code blocks (no \`\`\`)  
- DO NOT include any explanations or additional text
- DO NOT add any formatting characters or symbols

### Subject Line (First Line):
- MUST be ${COMMIT_RULES.subject.maxLength} characters or less
- Use IMPERATIVE MOOD (add, fix, update, remove, improve, enhance; NOT added, fixed, updated, removed)
- Start with LOWERCASE letter (except proper nouns like "API", "OAuth")
- NO period at the end
- Be EXTREMELY SPECIFIC about the exact change made
- Use PRECISE technical terminology
- Focus on WHAT changed and the EXACT impact
- Accuracy over brevity - be as specific as possible within character limit

### Body (Optional but recommended):
- Wrap lines at ${COMMIT_RULES.body.maxLineLength} characters
- Explain EXACT technical details and implementation specifics
- Use present tense and active voice
- Separate from subject with a blank line
- Use bullet points with "- " for lists, first character MUST be uppercase
- List SPECIFIC functions, files, or components modified
- Include WHY the change was needed and HOW it solves the problem
- Mention any side effects or implications
- Be technically precise and detailed

### Footer (Optional):
- Breaking changes: "BREAKING CHANGE: description"`;

		if (this.config.commitStyle === "conventional" || this.config.commitStyle === "detailed") {
			systemPrompt += `

### CONVENTIONAL COMMITS FORMAT:
Follow the Conventional Commits specification: <type>(<scope>): <subject>

**Required Types (ALL LOWERCASE):**
${Object.entries(CONVENTIONAL_TYPES)
	.map(([type, desc]) => `- ${type}: ${desc}`)
	.join("\n")}

**Scope (optional):** Component/module affected (auth, api, ui, db, etc.)

**Breaking Changes:** 
- Add "!" after type: feat!: or feat(scope)!:
- Or use footer: "BREAKING CHANGE: <description>"

**COMMIT TYPE SELECTION GUIDELINES (CRITICAL - ANALYZE PRECISELY):**

**ULTRA-PRECISE TYPE DEFINITIONS:**
- **style**: ONLY code formatting, whitespace, semicolons, linting fixes (ZERO functional changes)
- **fix**: Bug fixes, error corrections, resolving broken functionality, fixing crashes/errors
- **feat**: EXCLUSIVELY truly NEW features/functionality that never existed before
- **refactor**: Code restructuring, optimization, cleanup WITHOUT changing external behavior
- **docs**: Documentation changes (README, *.md files, comments, guides, examples)
- **test**: Adding, modifying, or removing tests
- **chore**: Dependencies, build scripts, configuration files, tooling
- **perf**: Performance improvements with measurable impact
- **ci**: CI/CD pipeline, GitHub Actions, build processes, automation
- **revert**: Reverting previous commits

**DECISION TREE FOR ULTRA-PRECISE TYPE SELECTION:**
1. **FIRST**: Examine file extensions - any .md files? → ALWAYS "docs"
2. **SECOND**: Look at diff content - ONLY whitespace/formatting? → ALWAYS "style"
3. **THIRD**: Is broken code being fixed/corrected? → ALWAYS "fix"
4. **FOURTH**: Are test files being added/modified? → ALWAYS "test"
5. **FIFTH**: Are package.json, config files, or build tools changed? → ALWAYS "chore"
6. **SIXTH**: Is existing code being restructured/optimized without new features? → ALWAYS "refactor"
7. **SEVENTH**: Is performance being improved? → ALWAYS "perf"
8. **LAST**: Is completely NEW functionality being added? → ONLY THEN "feat"

**CRITICAL ANTI-PATTERNS TO ABSOLUTELY AVOID:**
- NEVER use "feat" for code formatting → use "style"
- NEVER use "feat" for bug fixes → use "fix"
- NEVER use "feat" for refactoring → use "refactor"
- NEVER use "feat" for documentation → use "docs"
- NEVER use "feat" for config changes → use "chore"
- NEVER use "feat" for test changes → use "test"
- NEVER use "feat" as a default - be EXTREMELY specific
- NEVER use "feat" for improvements to existing features → use "refactor"
- "feat" is ONLY for 100% NEW functionality that never existed before

**Examples (note lowercase format with proper spacing):**
- feat(auth): add OAuth2 login support
- fix(api): resolve user data validation error  
- docs: update installation instructions
- refactor!: restructure user authentication system
- chore: update dependencies to latest versions
- style: format code according to linting rules
- test(auth): add unit tests for login functionality
- perf(api): optimize database queries

**Body Formatting Examples:**
feat(auth): add OAuth2 login support

- implement Google OAuth2 integration
- add user session management
- create secure token handling
- update login UI components

This replaces the old password-based system and provides
better security and user experience.

**IMPORTANT FORMATTING:** 
- Type and scope should be lowercase
- Subject description starts with lowercase verb
- Only proper nouns (API, OAuth, etc.) should be capitalized
- Always include space after colon in "type(scope): description"
- Use "- " (dash + space) for bullet points in body
- Keep bullet points concise and actionable
- Choose the MOST SPECIFIC and APPROPRIATE commit type`;
		}

		let userPrompt = `Analyze these STAGED Git changes with EXTREME PRECISION and create the most accurate commit message possible:

## STAGED FILE CHANGES:
${changes}

## STAGED CODE DIFF:
${diff}

## ULTRA-PRECISE STAGED CHANGE ANALYSIS:
Perform a microscopic analysis of every single STAGED change. You MUST be 100% accurate:

### 1. STAGED FILE-BY-FILE ANALYSIS:
- Examine EACH staged file individually
- Identify EXACT functions, classes, or components modified in staged changes
- Determine if staged files were added, modified, deleted, or renamed
- Note file types and extensions (.md = docs, .test.js = test, etc.)

### 2. STAGED CODE CHANGE SPECIFICS:
- What EXACT functions, methods, or variables were changed in the staged files?
- Are these NEW additions or modifications to existing code in the staged changes?
- What specific algorithms, logic, or implementations changed in the staged diff?
- Are there imports, exports, or dependencies modified in the staged files?

### 3. STAGED CHANGE TYPE IDENTIFICATION:
- Are the staged changes fixing a bug/error? (= fix)
- Are the staged changes adding completely new functionality? (= feat)
- Are the staged changes improving/restructuring existing code? (= refactor)
- Are the staged changes only formatting/styling? (= style)
- Are the staged changes documentation? (= docs)
- Are the staged changes testing? (= test)
- Are the staged changes configuration/build tools? (= chore)
`;

		if (context) {
			userPrompt += `\n\n## STAGED FILE CONTENT CONTEXT:
${context}`;
		}

		userPrompt += `

## FORMATTING REQUIREMENTS:
Follow this template: ${styleConfig.template}

## COMMIT TYPE ANALYSIS - MICROSCOPIC PRECISION:

**STEP 1: STAGED FILE EXTENSION ANALYSIS (FIRST PRIORITY)**
- ANY .md files in staged changes? → AUTOMATICALLY "docs"
- ANY .test.js, .spec.js, test/ files in staged changes? → AUTOMATICALLY "test"
- ANY package.json, config files, build files in staged changes? → AUTOMATICALLY "chore"

**STEP 2: STAGED DIFF CONTENT ANALYSIS (SECOND PRIORITY)**
- ONLY whitespace, indentation, formatting changes in staged diff? → AUTOMATICALLY "style"
- Error handling, bug fixes, crash fixes in staged changes? → AUTOMATICALLY "fix"
- Performance optimizations in staged changes? → AUTOMATICALLY "perf"

**STEP 3: STAGED FUNCTIONALITY ANALYSIS (THIRD PRIORITY)**
- Code restructuring, cleanup, optimization WITHOUT new features in staged changes? → "refactor"
- BRAND NEW functions, classes, features never existed in staged changes? → "feat"

**STEP 4: STAGED CHANGES DOUBLE-CHECK VERIFICATION**
- Re-examine the staged diff to confirm your choice
- If any .md file is in staged changes → MUST be "docs"
- If only formatting/styling in staged changes → MUST be "style"
- If fixing errors/bugs in staged changes → MUST be "fix"
- If adding tests in staged changes → MUST be "test"
- "feat" ONLY if genuinely new functionality in staged changes

## ULTRA-PRECISE SCOPE IDENTIFICATION FOR STAGED CHANGES:
Identify the EXACT component affected in the staged files with surgical precision:
- Analyze staged file paths: src/auth/ → "auth", src/api/ → "api", components/ui/ → "ui"
- Look at import statements and module references in staged changes
- For single staged file changes, use the main component/module name
- For multiple related staged files, use the common domain (auth, api, ui, cli, config, db, etc.)
- If unclear, examine function names and class names in the staged diff
- Use lowercase, concise scope names (max 10 characters)
- Common scopes: auth, api, ui, cli, config, db, test, build, deps, core

## SURGICAL ANALYSIS PROTOCOL FOR STAGED CHANGES:
1. **STAGED FILE EXTENSION CHECK**: .md files in staged → "docs", .test.js in staged → "test", package.json in staged → "chore"
2. **STAGED DIFF CONTENT ANALYSIS**: Look for error fixes, new functions, formatting changes in staged diff
3. **STAGED SCOPE DETERMINATION**: Identify the primary module/component affected in staged files
4. **TYPE CLASSIFICATION**: Use the decision tree above with 100% accuracy for staged changes
5. **IMPACT ASSESSMENT**: Breaking changes, new functionality, or improvements in staged changes?

## PRECISION ANALYSIS STEPS FOR STAGED CHANGES:
1. **Staged file-by-file examination**: Analyze each staged file individually
2. **Function-level analysis**: Identify specific functions/methods modified in staged changes
3. **Pattern recognition**: Detect if staged changes are bug fix, new feature, refactoring, etc.
4. **Context integration**: Consider how staged changes fit together
5. **Final verification**: Double-check type and scope accuracy for staged changes

## PRECISION EXAMPLES BY CHANGE TYPE:
- **New function/feature**: feat(auth): add OAuth2 login integration
- **Bug/error fix**: fix(api): resolve user validation error
- **Code improvement**: refactor(ui): optimize component rendering
- **Documentation**: docs: update API installation guide
- **Formatting only**: style: format code with prettier
- **Test changes**: test(auth): add login validation tests
- **Dependencies**: chore: update webpack to v5.0.0
- **Performance**: perf(db): optimize query execution time
- **Configuration**: chore(config): update eslint rules
- **Build tools**: chore(build): add typescript compiler

## FINAL ACCURACY CHECK:
**MANDATORY VERIFICATION STEPS:**
1. **File Extension Double-Check**: Any .md files → MUST be "docs"
2. **Diff Content Verification**: Only formatting → MUST be "style"
3. **Error Fix Confirmation**: Bug fixes/error handling → MUST be "fix"
4. **New Feature Validation**: Completely new functionality → ONLY THEN "feat"
5. **Test File Check**: Test files modified → MUST be "test"

**ULTRA-PRECISE PATTERN MATCHING:**
- **README.md or ANY *.md files changed**: ALWAYS "docs"
- **Only whitespace/formatting/linting changes**: ALWAYS "style"
- **Fixing bugs/errors/broken functionality**: ALWAYS "fix"
- **Adding completely new features/capabilities**: ALWAYS "feat" 
- **Improving existing code structure**: ALWAYS "refactor"
- **Comments/documentation in code**: ALWAYS "docs"
- **Adding/modifying test files**: ALWAYS "test"
- **package.json/config/build files**: ALWAYS "chore"
- **Performance improvements**: ALWAYS "perf"
- **CI/CD/GitHub Actions**: ALWAYS "ci"

**COMMON MISCLASSIFICATIONS TO AVOID:**
- README/documentation changes marked as "feat" → Should be "docs"
- Formatting changes marked as "feat" → Should be "style"
- Code improvements marked as "feat" → Should be "refactor"
- Bug fixes marked as "feat" → Should be "fix"
- Any *.md file changes marked as "feat" → Should be "docs"

## CRITICAL OUTPUT REQUIREMENTS:
- Return ONLY the commit message (no code blocks, no explanations)
- Use EXACT lowercase format as specified above
- Follow all formatting and length rules PRECISELY
- Be EXTREMELY specific and technically accurate
- Focus on EXACT changes made, not generic descriptions
- Do NOT wrap response in \`\`\` or any other formatting
- Use precise technical terminology

## FINAL ACCURACY CHECKLIST:
- **ANY .md FILES** → "docs" (NOT "feat", NOT "chore")
- **ONLY FORMATTING/WHITESPACE** → "style" (NOT "feat", NOT "refactor")
- **BUG/ERROR FIXES** → "fix" (NOT "feat", NOT "refactor")
- **CODE RESTRUCTURING** → "refactor" (NOT "feat")
- **TEST FILES** → "test" (NOT "feat")
- **CONFIG/DEPS/BUILD** → "chore" (NOT "feat")
- **NEW FUNCTIONALITY** → "feat" (ONLY if 100% new)

**ABSOLUTE RULE: BE SURGICALLY PRECISE - NO GUESSING!**
**ANALYZE EVERY SINGLE CHANGE WITH MICROSCOPIC ACCURACY!**
`;

		// Add custom prompt if provided
		if (this.config.customPrompt.trim()) {
			userPrompt += `\n\n## ADDITIONAL REQUIREMENTS:
${this.config.customPrompt}`;
		}

		// Add user feedback for regeneration
		if (userFeedback && userFeedback.trim()) {
			userPrompt += `\n\n## USER FEEDBACK FOR IMPROVEMENT:
The user provided the following feedback for improving the commit message:
"${userFeedback}"

Please take this feedback into account and adjust the commit message accordingly while maintaining all formatting requirements.`;
		}

		return {
			system: systemPrompt,
			user: userPrompt,
		};
	}

	cleanCommitMessage(message) {
		// Remove markdown code blocks and any surrounding formatting
		let cleaned = message.trim();

		// Remove code block markers
		cleaned = cleaned.replace(/^```[\w]*\n?/gm, "");
		cleaned = cleaned.replace(/\n?```$/gm, "");
		cleaned = cleaned.replace(/^```$/gm, "");

		// Remove any leading/trailing whitespace
		cleaned = cleaned.trim();

		// Split into lines and clean each line
		const lines = cleaned.split("\n");
		const cleanedLines = lines
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		// Rejoin with proper spacing
		return cleanedLines.join("\n");
	}

	async generateCommitMessage(changes, diff, context, userFeedback = "") {
		const provider = PROVIDERS[this.config.provider];
		const apiKey = await this.getApiKey();
		const prompts = this.getCommitPrompt(changes, diff, context, userFeedback);

		this.spinner = ora(
			"Analyzing changes and generating commit message...",
		).start();

		try {
			let requestBody;
			let headers = {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			};

			if (this.config.provider === "anthropic") {
				headers["anthropic-version"] = "2023-06-01";
				requestBody = {
					model: this.config.model,
					messages: [
						{ role: "user", content: `${prompts.system}\n\n${prompts.user}` },
					],
				};
			} else {
				if (this.config.provider === "openrouter") {
					headers["HTTP-Referer"] =
						"https://github.com/your-username/aicommit-js";
				}

				requestBody = {
					model: this.config.model,
					temperature: 0.3,
					messages: [
						{ role: "system", content: prompts.system },
						{ role: "user", content: prompts.user },
					],
				};
			}

			const response = await fetch(
				`${this.config.baseUrl}/${provider.endpoint}`,
				{
					method: "POST",
					headers,
					body: JSON.stringify(requestBody),
				},
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					`API request failed: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`,
				);
			}

			const data = await response.json();
			let message;

			if (this.config.provider === "anthropic") {
				message = data.content[0].text;
			} else {
				message = data.choices[0].message.content;
			}

			this.spinner.succeed(" Commit message generated");

			// Clean the message to remove any markdown formatting
			const cleanedMessage = this.cleanCommitMessage(message);
			return cleanedMessage;
		} catch (error) {
			this.spinner.fail("Failed to generate commit message");
			throw error;
		}
	}
}

