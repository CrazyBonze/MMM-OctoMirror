# Module: Display & Control OctoPrint Instance (MMM-OctoMirror)

This is a module for <a href="https://github.com/MichMich/MagicMirror">MagicMirror</a> that will interact with an OctoPrint Instance.

The module will allow you to:
- View a live feed of the raspicam stream
- Start and stop prints
- View G-Code viewer
- Manually control the printer
- Recieve live updates on printer status

If you have any suggest, please let me know [by an issue](https://github.com/CrazyBonze/MMM-OctoMirror/issues/new).

## Screenshot

![](https://github.com/CrazyBonze/MMM-OctoMirror/blob/master/img/capture.png)

## Requirements

* Raspberry Pi running an instance of Magic Mirror
* Another Raspberry Pi running an instance of OctoPi (or other OctoPrint instance)
* IP addresses for both (static IP preferred)

## Installation

````shell
cd ~/MagicMirror/modules
git clone https://github.com/CrazyBonze/MMM-OctoMirror.git
cd MMM-OctoMirror
npm install
# A version of OctoPrint's JS Client Library is included by default, but it's
# recommended to replace it with your server's version.
# Replace 'http://octopi.local' with your OctoPrint's URL/IP
wget http://octopi.local/static/webassets/packed_client.js -O packed_client.js
````

Go to your OctoPrint web portal, go to settings, scroll down to API and select it. At the top of the API settings make sure the checkbox for `Allow Cross Origin Resource Sharing (CORS)` is checked and copy your API key. You may need to restart your OctoPrint server.

## Using the Module

To use this module, add it to the modules array in the `config/config.js` file:

```js
    {
        module: "MMM-OctoMirror",
        position: "middle_center",
        config: {
            url: "http://octopi.local",
            api_key: "[OctoPrint API Key]"
        }
    },
```

### Configuration Options:

| Option           | Description
|----------------- |-----------
| `url` | *Required* - The url or IP address for the OctoPrint Instance.
| `api_key` | *Required* Your API Key from the OctoPrint service to be used.  You can find this in Octoprint's Options>Features>API, while you're there also enable Cross-Origin-Resorce-Sharing.
| `printerName` | *Optional* Add a name to show on top of the module;
| `showStream` | *Optional* Whether or not to show the camera stream.  By default a camera stream is shown, to disable, set to `false`;
| `flipStreamHorizontally` | *Optional* Flip the webcam stream around the X axis. <br>*Default:* `false`
| `flipStreamVertically` | *Optional* Flip the webcam stream around the Y axis. <br>*Default:* `false`
| `maxStreamWidth` | *Optional* Maximum width for stream display in pixels. If set to 0, the stream's actual width is used<br>*Default:* `0` (stream's width)
| `maxStreamHeight` | *Optional* Maximum height for stream display in pixels. If set to 0, the stream's actual height is used<br>*Default:* `0` (stream's height)
| `streamUrl` | *Optional* Set a custom url for accessing the MJPEG camera stream. By default it uses: `url:8080/?action=stream`.
| `showTemps` | *Optional* Whether or not so show temperature info<br>*Default:* `true`
| `showDetailsWhenOffline` | *Optional* Whether or not to hide the printer details when the printer is offline (file name, time, temps)
| `interactive` | *Optional* Allow interactive control of the printer: choose files to print and upload new files. <br> *Default:* `true`. Set to `false` to hide the drop downs, if you don't use the Mirror to control anything.
| `debugMode` | *Optional* Prints all messages received from the printer socket to the console log, for debugging only and developing more features.

## Development and Feature Requests

* If you have any feature requests or find any bugs, please post about it on the [MagicMirror Forum](https://forum.magicmirror.builders) or open an Issue on this repo.
* This module exposes the full client API for an OctoPrint instance and only displays the info that is useful to me at the moment, if there is something else you would like added, please let me know. The API is here:
    - http://docs.octoprint.org/en/master/api/push.html
