# Pi Extensions

Homemade Pi extensions live here.

This directory is mounted read-only into the container at:

```text
/home/node/.pi/agent/extensions
```

Pi auto-discovers extensions from this global path at startup. You can add:

```text
my-extension.ts
my-extension/index.ts
```

After editing an extension, restart the Pi session or run `/reload` inside Pi.
