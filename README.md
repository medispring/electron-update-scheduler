# Electron Update Scheduler
POC to schedule update of electron-app

To deploy on macOS don't forget to set these environment variables in a electron-builder.env file in your project folder:
- `GH_TOKEN="<your_token>"`
- `CSC_LINK="<path_to_your_p12_certificate>"`
- `CSC_KEY_PASSWORD="<password_of_your_p12_certificate>"`

To build or deploy on windows, leave out the `--mac` flag in the build and deploy scripts inside the package.json. And set the GH_TOKEN variable environment in a electron-builder.env file in your project folder.
