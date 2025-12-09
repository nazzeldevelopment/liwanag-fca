# Contributing to Liwanag 🌟

Salamat sa iyong interes na mag-contribute sa Liwanag! Ang gabay na ito ay tutulong sa iyo na magsimula.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Paano Makakapag-contribute](#paano-makakapag-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

## 📜 Code of Conduct

Ang proyektong ito ay sumusunod sa [Code of Conduct](CODE_OF_CONDUCT.md). Sa pag-participate, inaasahan na susundin mo ang code of conduct na ito.

## 🤝 Paano Makakapag-contribute

May maraming paraan para makatulong:

### 1. Reporting Bugs
- Gumamit ng GitHub Issues para mag-report ng bugs
- Tiyaking wala pang existing issue para sa bug
- Magbigay ng detalyadong paglalarawan
- Isama ang steps para ma-reproduce ang bug
- Magdagdag ng screenshots kung kailangan

### 2. Suggesting Enhancements
- Gumamit ng GitHub Issues para sa feature requests
- Ipaliwanag kung bakit useful ang feature
- Magbigay ng examples kung paano gagamitin

### 3. Code Contributions
- I-fork ang repository
- Gumawa ng bagong branch para sa iyong changes
- I-submit ang pull request

### 4. Documentation
- Tumulong sa pag-improve ng documentation
- Mag-translate ng docs sa iba't ibang languages
- Magdagdag ng examples at tutorials

### 5. Community Support
- Tumulong sa ibang developers sa Issues
- Mag-share ng iyong experience gamit ang Liwanag
- Mag-contribute sa discussions

## 🛠️ Development Setup

### Prerequisites

- Node.js 16.x o mas mataas
- npm o yarn
- Git
- TypeScript knowledge

### Installation

1. **Fork at i-clone ang repository**
```bash
git clone https://github.com/YOUR_USERNAME/liwanag-fca.git
cd liwanag-fca
```

2. **I-install ang dependencies**
```bash
npm install
```

3. **Mag-setup ng development environment**
```bash
# Gumawa ng .env file
cp .env.example .env
```

4. **I-build ang project**
```bash
npm run build
```

5. **Patakbuhin ang tests**
```bash
npm test
```

### Development Commands

```bash
# Build TypeScript
npm run build

# Watch mode para sa development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## 📝 Coding Standards

### TypeScript Guidelines

- Gumamit ng TypeScript para sa lahat ng bagong code
- I-define ang types para sa lahat ng functions
- Iwasan ang `any` type kung possible
- Gumamit ng interfaces para sa complex types

**Example:**
```typescript
interface MessageOptions {
    body: string;
    threadID: string;
    mentions?: Array<{id: string; tag: string}>;
}

async function magpadalaNgMensahe(options: MessageOptions): Promise<void> {
    // Implementation
}
```

### Naming Conventions

- **Variables at Functions**: camelCase
  ```typescript
  const userName = 'Juan';
  function getUserInfo() {}
  ```

- **Classes at Interfaces**: PascalCase
  ```typescript
  class MessageHandler {}
  interface UserData {}
  ```

- **Constants**: UPPER_SNAKE_CASE
  ```typescript
  const MAX_RETRY_COUNT = 3;
  ```

- **Filipino Method Names**: Gumamit ng proper Tagalog
  ```typescript
  magpadalaNgMensahe()  // ✓ Tama
  magpadalangMensahe()  // ✗ Mali
  ```

### Code Style

- Gumamit ng 2 spaces para sa indentation
- Lagyan ng semicolons ang end ng statements
- Maximum line length: 100 characters
- Gumamit ng single quotes para sa strings
- Magdagdag ng JSDoc comments sa public methods

**Example:**
```typescript
/**
 * Magpadala ng mensahe sa isang thread
 * @param message - Ang mensahe na ipapadala
 * @param threadID - Ang ID ng thread
 * @returns Promise na nagresolve kapag naipadala na ang mensahe
 */
async function magpadalaNgMensahe(
  message: string,
  threadID: string
): Promise<void> {
  // Implementation
}
```

### Error Handling

- Gumamit ng try-catch blocks
- I-throw ang specific error types
- Magbigay ng helpful error messages

```typescript
try {
  await magpadalaNgMensahe('Hello', threadID);
} catch (error) {
  if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    throw error;
  }
}
```

## 📌 Commit Guidelines

### Commit Message Format

Gumamit ng conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Bagong feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (walang logic changes)
- `refactor`: Code refactoring
- `test`: Pagdagdag o pag-edit ng tests
- `chore`: Maintenance tasks

### Examples

```bash
# Bagong feature
feat(messaging): magdagdag ng support para sa voice messages

# Bug fix
fix(auth): ayusin ang cookie refresh issue

# Documentation
docs(readme): mag-update ng installation instructions

# Refactor
refactor(api): i-improve ang error handling

# Test
test(messaging): magdagdag ng unit tests para sa sendMessage
```

### Scope

Ang scope ay dapat specific sa area ng change:
- `messaging`
- `auth`
- `api`
- `utils`
- `security`
- `logging`

## 🔄 Pull Request Process

### Bago Mag-submit ng PR

1. **I-update ang iyong branch**
```bash
git checkout main
git pull upstream main
git checkout your-branch
git rebase main
```

2. **I-test ang iyong changes**
```bash
npm test
npm run lint
```

3. **I-build ang project**
```bash
npm run build
```

4. **I-update ang documentation** kung kailangan

### PR Guidelines

1. **Magbigay ng descriptive title**
   - ✓ "feat: Magdagdag ng auto-refresh cookies feature"
   - ✗ "Update code"

2. **I-fill out ang PR template**
   - Ilarawan ang changes
   - Link sa related issues
   - Magdagdag ng screenshots kung applicable

3. **I-keep ang PR focused**
   - Isa lang ang feature o bug fix per PR
   - Huwag mag-mix ng unrelated changes

4. **I-respond sa feedback**
   - Basahin ang comments mula sa reviewers
   - Gumawa ng requested changes
   - Mag-resolve ng conversations

5. **Maghintay ng approval**
   - Kailangan ng at least 1 approval
   - All checks dapat passing

### PR Template

```markdown
## Description
Maikling paglalarawan ng changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## Testing
Paano mo na-test ang changes:
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Checklist
- [ ] Sumusunod sa coding standards
- [ ] Nag-update ng documentation
- [ ] Nag-add ng tests
- [ ] Lahat ng tests ay passing
- [ ] Nag-update ng CHANGELOG.md
```

## 🐛 Reporting Bugs

### Bago Mag-report ng Bug

1. Tiyaking updated ang iyong Liwanag version
2. I-check kung may existing issue na
3. Subukan sa clean environment

### Bug Report Template

```markdown
**Describe the Bug**
Malinaw na paglalarawan ng bug

**To Reproduce**
Steps para ma-reproduce:
1. Gawin ito '...'
2. I-click ang '...'
3. Makita ang error

**Expected Behavior**
Ano ang dapat mangyari

**Actual Behavior**
Ano ang nangyari

**Screenshots**
Kung applicable, magdagdag ng screenshots

**Environment**
- OS: [e.g. Windows 10]
- Node.js version: [e.g. 16.14.0]
- Liwanag version: [e.g. 1.0.0]

**Additional Context**
Ibang relevant information
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Feature Description**
Malinaw na paglalarawan ng feature

**Problem it Solves**
Anong problema ang sosolusyunan ng feature

**Proposed Solution**
Paano mo gustong i-implement

**Alternatives Considered**
Ibang solutions na na-consider mo

**Additional Context**
Mockups, examples, o ibang relevant info
```

## 🧪 Testing Guidelines

### Writing Tests

- I-test ang lahat ng bagong features
- I-maintain ang test coverage above 80%
- Gumamit ng descriptive test names

```typescript
describe('magpadalaNgMensahe', () => {
  it('dapat makapag-send ng simple text message', async () => {
    // Test implementation
  });

  it('dapat mag-throw ng error kung walang threadID', async () => {
    // Test implementation
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- messaging.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

## 📚 Documentation Guidelines

### Writing Documentation

- Gumamit ng clear at simple language
- Magbigay ng examples
- I-include ang both English at Tagalog kung possible
- I-update ang CHANGELOG.md para sa lahat ng changes

### Documentation Types

1. **API Documentation**: JSDoc comments sa code
2. **README.md**: General information at quick start
3. **Tutorials**: Step-by-step guides
4. **Examples**: Code examples sa `examples/` folder

## 🌐 Translation Guidelines

Kung nag-contribute ng translations:

- Siguraduhing accurate ang translation
- I-maintain ang technical terms
- I-test sa target language
- I-include ang both versions kung kailangan

## 👥 Community

### Communication Channels

- **GitHub Issues**: Bug reports at feature requests
- **GitHub Discussions**: General discussions
- **Pull Requests**: Code contributions

### Getting Help

Kung may tanong ka:

1. I-check ang documentation
2. Maghanap sa existing issues
3. Gumawa ng bagong issue kung walang answer

## 🎉 Recognition

Ang lahat ng contributors ay makikita sa:
- README.md contributors section
- GitHub contributors page
- CHANGELOG.md (para sa significant contributions)

## 📄 License

Sa pag-contribute sa Liwanag, sumasang-ayon ka na ang iyong contributions ay licensed under ang MIT License.

## ❓ Questions?

Kung may tanong ka tungkol sa pag-contribute, huwag mag-atubiling:
- Mag-open ng issue sa GitHub
- Mag-start ng discussion
- Mag-contact sa maintainers

---

**Salamat sa iyong contribution sa Liwanag! Together, gawing mas maganda ang library para sa Filipino developers! 🇵🇭✨**
