# SignalWord contact viewer

The viewer will be a mobile-first React and Vite application. Its only public capability is rendering the scoped event projection returned by `GET /v1/public/events/{token}`.

It must never persist a viewer token in analytics, browser storage, logs, or query parameters. Until the React scaffold is added, this folder intentionally has no dependency manifest or production build command.
