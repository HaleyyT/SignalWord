# SignalWord contact viewer

The viewer is a mobile-first React and Vite application. It renders scoped event projections and provides the explicit trusted-contact confirmation screen. Confirmation is a user-initiated POST so email link scanners cannot consume a single-use token merely by opening the URL.

It must never persist a viewer or confirmation token in analytics, browser storage, logs, or query parameters. New links keep capabilities in URL fragments and send them only in bounded POST bodies through a fixed same-origin proxy. Older path links remain readable for compatibility; they retain the historical URL-log exposure. New network requests do not put capabilities in paths or query strings. Run it locally with `npm run dev --workspace=@signalword/viewer`; build and tests run through the repository’s `npm run verify` command.
