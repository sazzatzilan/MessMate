# MessMate

A phone website for one hostel mess. Members turn meals off, add guests, and send deposits. The manager checks the bazar money, sets the rates, and can close a past month.

The day-to-day copy stays in the browser on that phone. The same opening books for Green Hostel (members, meals, guests, deposits, and rates) are in the Supabase project named MessMate.

## Run it on this computer

1. Install Node.js 20 or newer from https://nodejs.org if it is not installed.
2. Double-click `start.bat`.
3. Open the address the window prints. That is http://127.0.0.1:3000 unless that port is already in use.

### Sign in

| Who | Username | Password |
| --- | --- | --- |
| Manager, Sifat | sifat | Shifat@101 |
| Nahid | nahid | Nahid123! |
| Nihal | nihal | Nihal123! |

## Install it on an Android phone

The published site is https://sazzatzilan.github.io/MessMate/

1. Open that address in Chrome on the phone.
2. Tap Install MessMate when it appears, or open the Chrome menu and choose Install app.

The page has to be the https address above. A plain http address on the local Wi-Fi will open the site, and Chrome will not offer install.

To build the site yourself, run `npm run build`. The files land in `out`. `npm start` serves that folder on port 3000 for every device on the Wi-Fi.
