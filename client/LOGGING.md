# Logging Configuration

This project includes a logging utility that allows you to disable all console logs in the frontend.

## How it works

The logging utility (`src/utils/logger.js`) automatically disables all console methods when:

1. **Production mode** (`import.meta.env.PROD === true`) - All logs are automatically disabled
2. **Development mode** with `VITE_DISABLE_LOGS=true` - Logs are disabled when the environment variable is set

## Environment Variables

Add the following to your `.env` file:

```env
# Disable all console logs in development (optional)
VITE_DISABLE_LOGS="true"
```

## Affected Console Methods

The following console methods are disabled when logging is turned off:

- `console.log()`
- `console.info()`
- `console.debug()`
- `console.warn()`
- `console.error()`
- `console.trace()`
- `console.group()`
- `console.groupEnd()`
- `console.groupCollapsed()`
- `console.table()`
- `console.clear()`
- `console.count()`
- `console.countReset()`
- `console.time()`
- `console.timeEnd()`
- `console.timeLog()`
- `console.assert()`
- `console.dir()`
- `console.dirxml()`

## Accessing Original Console (Debugging)

In production, the original console methods are still accessible via:

```javascript
console.original.log('This will still work');
```

## Implementation

The logger is imported in `src/main.jsx` and runs before the React app initializes, ensuring all logs are disabled from the start.
