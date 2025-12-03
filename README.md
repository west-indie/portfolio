# Leo Nunez – Technical Director & Creative Coder  
Portfolio Website

> A Vite + React + TypeScript + Tailwind + Framer Motion single-page app, deployed to GitHub Pages.

Live site: **https://west-indie.github.io/portfolio/**  
GitHub repo: **https://github.com/west-indie/portfolio**

---

## 0. Super-short student cheatsheet (Web Editor version)

If all you want to do is **add or update works** and **redeploy**, follow this:

1. Go to **`src/content/projects/`** in the GitHub repo (web UI).
2. To **add a new work**:
   - Click **“Add file → Create new file”**.
   - Name it something like `my-project-slug.md`.
   - Paste in a copy of an existing project file and edit:
     - `slug`, `title`, `year`, `disciplines`, `role`, `shortDescription`, media paths, etc.
   - Scroll down, write a commit message (e.g. `Add new project`), click **“Commit changes”**.
3. To **edit an existing work**:
   - Click the `.md` file.
   - Click the pencil icon (Edit).
   - Make changes.
   - Commit changes.
4. To **update images or video**:
   - Go to the **`public`** folder in the repo.
   - Use the **“Upload files”** button into:
     - `public/images/projects/` for images
     - `public/video/projects/` for .mp4 clips
   - Make sure the paths in the `.md` frontmatter match, e.g. `/images/projects/my-file.jpg`.
5. After you commit:
   - GitHub Actions automatically builds and deploys.
   - Wait ~1–2 minutes, then refresh **https://west-indie.github.io/portfolio/**.

Everything below explains this in more detail.

---

## 1. Live Site & Tech Stack

- **Live URL:**  
  `https://west-indie.github.io/portfolio/`

- **Built with:**
  - [Vite](https://vitejs.dev/) (React + TypeScript)
  - [React Router](https://reactrouter.com/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [Framer Motion](https://www.framer.com/motion/)
  - Markdown + frontmatter for content (`src/content/projects`)
  - GitHub Pages + GitHub Actions for deployment

This project is designed so that **most maintenance** involves:

1. Updating **projects** (works) via Markdown files.
2. Updating **images/video** in `public/`.
3. Optionally updating **CV**, **social links**, and **contact form settings**.
4. Committing changes via the GitHub web editor (no command line required).
5. Letting GitHub Actions handle deployment automatically.

---

## 2. Project Structure Overview

Key directories and files:

```text
.
├─ public/
│  ├─ cv.pdf                 # Downloadable CV (replace with your own)
│  ├─ images/
│  │  └─ projects/           # Project images go here
│  └─ video/
│     └─ projects/           # Project .mp4 clips go here
├─ src/
│  ├─ content/
│  │  └─ projects/           # Markdown files, one per project
│  ├─ components/            # Layout, navigation, project cards, etc.
│  ├─ pages/                 # Home, Work, ProjectDetail, About, Contact
│  ├─ config.ts              # Site title, Formspree endpoint, social links
│  ├─ polyfills/
│  │  └─ buffer.ts           # Buffer polyfill (do not remove)
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ index.css
├─ vite.config.ts            # Vite config, base: "/portfolio/"
├─ tailwind.config.(cjs|ts)
├─ postcss.config.(cjs|js)
├─ package.json
└─ .github/
   └─ workflows/
      └─ deploy.yml          # GitHub Pages deployment workflow
````

You **mostly** only need:

* `src/content/projects/` (works/projects)
* `public/images/projects/` and `public/video/projects/` (media)
* `public/cv.pdf` (CV)
* `src/config.ts` (Formspree + social links)

---

## 3. Editing & Adding Works (Projects)

All portfolio works (“Projects”) live as **Markdown files** in:

```text
src/content/projects/
```

Each file:

1. Starts with YAML **frontmatter** (metadata).
2. Has a **Markdown body** with the long-form description (overview, process, etc.).

### 3.1. Frontmatter fields

Each project file should begin with something like:

```md
---
slug: "my-project-slug"
title: "Project Title"
year: "2024"
disciplines:
  - theatre
  - lighting-production
role: "Technical Director"
client: "Optional Client or Institution"
location: "City / Venue (optional)"
shortDescription: "1–2 sentence blurb for cards."
tags:
  - "Max/MSP"
  - "QLab"
featured: true
techStack:
  - "TypeScript"
  - "React"
collaborators:
  - name: "Jane Doe"
    role: "Director"
  - name: "John Smith"
    role: "Lighting Designer"
links:
  github: "https://github.com/example"
  liveDemo: "https://example.com"
  press:
    - "https://press-link-1.example"
    - "https://press-link-2.example"
media:
  heroImage: "/images/projects/my-project-hero.jpg"
  gallery:
    - type: "image"
      src: "/images/projects/my-project-1.jpg"
      caption: "Rehearsal still."
    - type: "video"
      src: "/video/projects/my-project-clip.mp4"
      caption: "Performance excerpt."
    - type: "embed"
      src: "https://player.vimeo.com/video/123456"
      caption: "Optional external embed."
---
Long-form description here in **Markdown**.

You can add sections, bullet lists, etc.
```

#### Required fields

To show up nicely on cards and the project page, you should always include:

* `slug`: unique ID for the URL (`/work/<slug>`).
  Use lowercase with hyphens, no spaces.
* `title`: project title.
* `year`: year of the work (string, e.g. `"2024"`).
* `disciplines`: one or more of:

  * `code-programs`
  * `theatre`
  * `lighting-production`
  * `short-film`
  * `sound-design`
  * `live-electronics`
  * `interactive-media`
* `role`: e.g. `"Technical Director"`, `"Programmer"`, `"Lighting Designer"`.
* `shortDescription`: 1–2 sentences; appears on the Work page cards and Featured section.

#### Useful optional fields

* `client`: company, theatre, or collaborator organization.
* `location`: city, venue, festival, etc.
* `tags`: technology or context keywords, e.g. `"Max/MSP"`, `"QLab"`, `"Unity"`, `"Premiere"`.
* `featured: true`: shows the project on the **Home** page “Featured Work” strip.
* `techStack`: relevant tools for code/program projects.
* `collaborators`: list of people with roles.
* `links`:

  * `github`: code repo URL.
  * `liveDemo`: site or video link.
  * `press`: array of press/review URLs.
* `media`:

  * `heroImage`: main image used on cards and top of detail page.
  * `gallery`: more images or videos.

The Markdown body (everything after the `---` frontmatter) is used as the main description.

---

### 3.2. Adding a New Project (using the GitHub web editor)

1. Go to the repo on GitHub:
   `https://github.com/west-indie/portfolio`

2. In the file browser:

   * Click into `src/`
   * Then `content/`
   * Then `projects/`

3. Click the **“Add file” → “Create new file”** button.

4. Give it a filename like:

   ```text
   my-project-slug.md
   ```

5. Copy the frontmatter + markdown template from an existing file (e.g. `theatre-show.md`) and paste into the new file.

6. Edit:

   * `slug`, `title`, `year`, `disciplines`, `role`, `shortDescription`.
   * `media.heroImage` and `media.gallery` references for images and video (see Section 4).
   * Markdown body text at the bottom.

7. Scroll down to the **Commit changes** box:

   * Write a message like `Add new project: My Project Title`.
   * Click **“Commit changes”**.

8. Wait a minute or two for deployment (see Section 7), then check:
   `https://west-indie.github.io/portfolio/work`
   and
   `https://west-indie.github.io/portfolio/work/my-project-slug`.

---

### 3.3. Editing an Existing Project (web editor)

1. Navigate to `src/content/projects/` in the GitHub repo.
2. Click the file you want to edit (e.g. `short-film.md`).
3. Click the pencil icon in the top right (Edit this file).
4. Edit frontmatter and/or the markdown body.
5. Scroll down, write a commit message (e.g. `Update film synopsis`), click **“Commit changes”**.
6. Wait for deployment, then refresh the live site.

---

### 3.4. Removing a Project

1. Open the project file in `src/content/projects/`.
2. Click the **“…”** (More) menu on the file, choose **“Delete file”**.
3. Scroll down, commit the deletion.
4. Optional: remove any unused images/video from `public/images/projects/` or `public/video/projects/`.
5. Deployment is automatic after commit.

---

## 4. Managing Images & Video

### 4.1. Images

Store project images here:

```text
public/images/projects/
```

To upload via web:

1. In the repo web view, click the `public` folder.
2. Click `images/`, then `projects/`.
3. Click **“Add file” → “Upload files”**, drag your images in, then commit.

In your project frontmatter, reference them like:

```yaml
media:
  heroImage: "/images/projects/my-project-hero.jpg"
  gallery:
    - type: "image"
      src: "/images/projects/my-project-1.jpg"
      caption: "Stage setup."
```

**Tips:**

* Use descriptive filenames (e.g. `inuksuit-2024-stage.jpg`).
* Keep resolution reasonable (e.g. 1600–2000px wide).

### 4.2. Video

Self-hosted video clips go in:

```text
public/video/projects/
```

Upload via GitHub web editor:

1. Go to `public/video/projects/`.
2. Click **“Upload files”**.
3. Add `.mp4` files, commit changes.

Then reference them in frontmatter:

```yaml
media:
  gallery:
    - type: "video"
      src: "/video/projects/my-project-clip.mp4"
      caption: "Performance excerpt."
```

The project page will render this as `<video controls>`.

You can also embed external players (like Vimeo):

```yaml
media:
  gallery:
    - type: "embed"
      src: "https://player.vimeo.com/video/123456"
      caption: "Festival cut."
```

---

## 5. Updating CV & Contact Details

### 5.1. CV

The About page has a “Download CV” button linking to:

```text
public/cv.pdf
```

To update:

1. In the repo web interface, open the `public` folder.
2. If `cv.pdf` exists:

   * Click it, then click “Replace file” or use “Upload files” and overwrite.
3. If it doesn’t exist:

   * Click **“Upload files”** and add your `cv.pdf`.
4. Commit changes.

No code changes needed.

### 5.2. Contact Form (Formspree)

The Contact page uses a Formspree endpoint defined in `src/config.ts`:

```ts
export const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_ME";
```

To configure:

1. Create a Formspree form and copy the endpoint URL.
2. In GitHub web editor:

   * Navigate to `src/`.
   * Click `config.ts`.
   * Click the pencil icon to edit.
   * Replace `"https://formspree.io/f/REPLACE_ME"` with your actual URL.
3. Commit changes.

The form will then send submissions to that endpoint and show success/error states.

### 5.3. Social Links

`src/config.ts` (or a similar file) also defines social links, e.g.:

```ts
export const SOCIAL_LINKS = {
  email: "mailto:you@example.com",
  github: "https://github.com/west-indie",
  linkedin: "https://linkedin.com/in/YOUR-LINK",
  instagram: "https://instagram.com/YOUR-HANDLE",
};
```

To update:

1. Edit `src/config.ts` in the web editor.
2. Change the URLs to your actual accounts.
3. Commit changes.

The header/footer and contact page will pick up these values.

---

## 6. Running the Site Locally (Optional)

If you want to preview on your own computer (not required for basic maintenance):

### 6.1. Requirements

* Node.js LTS (e.g. 18+)
* npm

### 6.2. Setup

```bash
git clone https://github.com/west-indie/portfolio.git
cd portfolio
npm install
```

### 6.3. Dev server

```bash
npm run dev
```

Open the URL shown (usually `http://localhost:5173/`). Changes to files in `src/` or `public/` should hot-reload.

### 6.4. Build & test locally

```bash
npm run lint
npm run test
npm run build
```

If these pass locally, GitHub Actions should also succeed.

---

## 7. Building & Deploying (GitHub Actions)

Deployment is automated via `.github/workflows/deploy.yml`.

### What happens on each push to `main`?

1. GitHub Actions:

   * Checks out the repo.
   * Installs dependencies.
   * Runs `npm run lint`.
   * Runs `npm run test`.
   * Runs `npm run build`.
   * Deploys the `dist` folder to GitHub Pages.

2. After the workflow finishes:

   * The updated site is available at:
     `https://west-indie.github.io/portfolio/`

You don’t have to run any manual build or deployment commands if you’re using the web editor—just commit your changes, wait a bit, and refresh the live URL.

---

## 8. Vite `base` Configuration (Important if Repo Name Changes)

The site is served from:

```text
https://west-indie.github.io/portfolio/
```

In `vite.config.ts`, the `base` must be:

```ts
export default defineConfig({
  plugins: [react()],
  base: "/portfolio/", // matches the repo name
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

Only change this if:

* You rename the repo from `portfolio` to something else.
* Or you move the site to a user root like `https://west-indie.github.io/` (in which case `base` should be `"/"`).

If you ever do change `base`:

1. Edit `vite.config.ts`.
2. Commit the change.
3. Let GitHub Actions rebuild and deploy.

---

## 9. Notes & Gotchas

* **Don’t delete the buffer polyfill**:

  * File: `src/polyfills/buffer.ts`
  * Import: at the top of `src/main.tsx`
  * It ensures `Buffer` is defined for the markdown/frontmatter parser.
  * Removing it will cause `Buffer is not defined` errors in the browser.

* **Disciplines & filters**:

  * The Work page filters by `disciplines` in frontmatter.
  * Supported values:

    * `code-programs`
    * `theatre`
    * `lighting-production`
    * `short-film`
    * `sound-design`
    * `live-electronics`
    * `interactive-media`
  * You can add other strings, but if you want them to appear in the filter UI, you may also need to update a config/label map in the code. For basic usage, stick to the existing ones.

* **Featured projects**:

  * Set `featured: true` in frontmatter to show a project on the Home page’s Featured Work section.
  * If too many are featured, it may show a subset; you can adjust which ones are marked featured.

---

## 10. Command Summary (for local development)

From the project root:

```bash
npm install       # install dependencies (first time)
npm run dev       # run local dev server
npm run lint      # run ESLint
npm run test      # run Vitest tests
npm run build     # build production bundle
```

For the student using the GitHub web editor, the most important part is:

* Edit or add `.md` files in `src/content/projects/`
* Upload media into `public/images/projects/` or `public/video/projects/`
* Replace `public/cv.pdf` as needed
* Update `src/config.ts` for Formspree and social links
* Commit changes; let GitHub Actions redeploy automatically.
