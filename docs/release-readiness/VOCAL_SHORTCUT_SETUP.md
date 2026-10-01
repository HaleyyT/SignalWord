# Set up SignalWord voice activation

SignalWord exposes Apple App Intents. iOS recognizes the phrase you train and invokes the selected action. SignalWord does not train a phrase automatically, continuously record audio, or infer whether you are in danger.

## First practice setup

1. Open the verified SignalWord build, sign in and confirm your trusted contact. Send a manual TEST and verify receipt.
2. Open Apple's **Shortcuts / Phím tắt** app. Add a shortcut (+), search **SignalWord**, and select **Send TEST Alert**. Save it as **SignalWord TEST**. Do not select Trigger Alert for this rehearsal.
3. Open iPhone **Settings → Accessibility → Vocal Shortcuts / Phím tắt giọng nói → Add Action**.
4. Select the saved **SignalWord TEST** shortcut. Train a distinctive practice phrase when iOS prompts. Keep the phrase private and leave Vocal Shortcuts enabled.
5. Speak it while unlocked. Verify a new TEST was accepted, delivered to your consenting contact, acknowledged through that contact's link and then resolved in the app. A shortcut checkmark alone does not prove delivery.
6. Repeat once with the screen locked, after the phone has been unlocked since restarting. Record the build, approximate time and outcome without sending your phrase or recipient link. Stop if it fails; do not assume locked execution works.
7. Only after rehearsal succeeds, create a separate shortcut using **Trigger Alert** for REAL alerts and train a different phrase. Do not use the REAL phrase for ordinary practice.

The in-app Home help sheet and Settings contain the same setup flow and a native Shortcuts link. If SignalWord is missing, open the updated app once, then reopen Shortcuts and search inside the action editor. Report the installed build and a screenshot without your private phrase if still absent.

## Location and limits

You may repeat a TEST after enabling the app's optional location permission. Verify that the recipient sees a recent snapshot. Missing location must not prevent an alert; location is not continuous tracking. Resolve the previous rehearsal before another test.

Network access, a valid session and iOS execution availability are necessary. `.alwaysAllowed` and `openAppWhenRun=false` express intent configuration, not a guarantee of locked operation. Simulator discovery was verified for build 3; the owner's iOS 26.7 voice/locked/after-reboot behavior still needs physical acceptance.

Apple guidance: https://support.apple.com/en-mt/guide/iphone/iph7f242ea2c/ios
