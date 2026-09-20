# SignalWord contact viewer

The viewer is a mobile-first React and Vite application. Its only public capability is rendering the scoped event projection returned by `GET /v1/public/events/{token}`.

It must never persist a viewer token in analytics, browser storage, logs, or query parameters. Run it locally with `npm run dev --workspace=@signalword/viewer`; build and tests run through the repository’s `npm run verify` command.
