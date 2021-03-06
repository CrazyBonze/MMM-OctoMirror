/* global Module */
/* jshint esversion: 6 */

/* Magic Mirror
 * Module: MMM-OctoMirror
 *
 * By Micheal Taylor
 * MIT Licensed.
 */

Module.register("MMM-OctoMirror", {
	defaults: {
		updateInterval: 60 * 1000,
		retryDelay: 2500,
		printerName: "",
		showStream: true,
		maxStreamWidth: 0,
		maxStreamHeight: 0,
		flipStreamHorizontally: false,
		flipStreamVertically: false,
		showTemps: true,
		showDetailsWhenOffline: true,
		interactive: true, // Set to false to hide the file drop down and only show the stream.
		debugMode: false, // Set to true to log all messages from OctoPrint Socket
	},

	//Override dom generator.
	getDom: function () {
		var self = this;
		var wrapper = document.createElement("div");

		if (this.config.showStream) {
			var canvas = document.createElement("canvas");
			canvas.id = "player";
			var scaleX = this.config.flipStreamHorizontally ? "-1" : "1";
			var scaleY = this.config.flipStreamVertically ? "-1" : "1";
			canvas.style.transform = `scale(${scaleX}, ${scaleY})`;
			if (this.config.maxStreamWidth != 0) {
				canvas.style.maxWidth = `${this.config.maxStreamWidth}px`;
			}
			if (this.config.maxStreamHeight != 0) {
				canvas.style.maxHeight = `${this.config.maxStreamHeight}px`;
			}
			wrapper.appendChild(canvas);
			this.player = new MJPEG.Player(
				canvas,
				this.config.streamUrl
					? this.config.streamUrl
					: this.config.url + ":8080/?action=stream",
				{
					refreshRate: 250,
				}
			);
			this.player.start();
		}

		if (this.config.interactive) {
			//File menue dropdown
			var fileMenu = document.createElement("div");
			fileMenu.className = "menu";
			var fileList = document.createElement("select");
			for (var f in this.files) {
				var option = document.createElement("option");
				option.setAttribute("value", this.files[f]);
				option.appendChild(document.createTextNode(this.files[f]));
				fileList.appendChild(option);
			}

			//Send to printer button
			var printButton = document.createElement("button");
			printButton.innerHTML = "<i class=\"fa fa-print\"></i> Print";
			printButton.addEventListener("click", function () {
				self.sendPrint(fileList.value);
			});

			//Upload file button
			var uploadDiv = document.createElement("div");
			uploadDiv.className = "upload-wrapper";
			var uploadInput = document.createElement("input");
			uploadInput.setAttribute("type", "file");
			uploadInput.onchange = function () {
				self.uploadFile(uploadInput.files[0]);
			};
			var uploadButton = document.createElement("button");
			uploadButton.innerHTML = "<i class=\"fa fa-upload\"></i> Upload";

			//Add to DOM
			uploadDiv.appendChild(uploadInput);
			uploadDiv.appendChild(uploadButton);
			fileMenu.appendChild(uploadDiv);
			fileMenu.appendChild(fileList);
			fileMenu.appendChild(printButton);
			wrapper.appendChild(fileMenu);
		}

		var infoWrapper = document.createElement("div");
		infoWrapper.className = "small";
		if (this.config.printerName === "") {
			infoWrapper.innerHTML = "";
		} else {
			infoWrapper.innerHTML = `<span id="opPrinterName" class="title bright">${this.config.printerName}</span><br />`;
		}
		infoWrapper.innerHTML += `<span>${this.translate(
			"STATE"
		)}: </span><span id="opStateIcon"></span> <span id="opState" class="title bright"> </span>
                <br />
                <div id="opMoreInfo">
                <span>${this.translate(
		"FILE"
	)}: </span><span id="opFile" class="title bright">N/A</span>
                <br />
                <span>${this.translate(
		"ELAPSED"
	)}: </span><span id="opPrintTime" class="title bright">N/A</span>
                <span> | ${this.translate(
		"REMAINING"
	)}: </span><span id="opPrintTimeRemaining" class="title bright">N/A</span>
                <span> |
                <span id="oPercent" class="title bright">N/A</span>
                <progress id="oProgress" max="100" value=""></progress>
                <br />
      `;

		if (this.config.showTemps) {
			infoWrapper.innerHTML += `
                <span>${this.translate("TEMPS")} : ${this.translate(
	"NOZZLE"
)}: </span><span id="opNozzleTemp" class="title bright">N/A</span>
                <span> ${this.translate(
		"TARGET"
	)}: (<span id="opNozzleTempTgt">N/A</span><span>) | ${this.translate(
	"BED"
)}: </span><span id="opBedTemp" class="title bright">N/A</span>
                <span> ${this.translate(
		"TARGET"
	)}: (<span id="opBedTempTgt">N/A</span><span>)</span>
                </div>
                `;
		}

		wrapper.appendChild(infoWrapper);
		return wrapper;
	},

	start: function () {
		Log.info("Starting module: " + this.name);
		this.files = [];
		this.loaded = false;
		if (this.config.interactive) {
			this.scheduleUpdate(this.config.initialLoadDelay);
		}
		this.updateTimer = null;

		this.opClient = new OctoPrintClient();
		this.opClient.options.baseurl = this.config.url;
		this.opClient.options.apikey = this.config.api_key;
	},

	initializeSocket: function () {
		let user = "_api",
			session = "";

		$.ajax({
			url: this.config.url + "/api/login",
			type: "post",
			data: { passive: true },
			headers: {
				"X-Api-Key": this.config.api_key,
			},
			dataType: "json",
		}).done((data) => {
			if (this.config.debugMode) {
				console.log("Octoprint login response:", data);
			}
			session = data.session;
			// Subscribe to live push updates from the server
			this.opClient.socket.connect();
		});

		this.opClient.socket.onMessage("connected", (message) => {
			if (this.config.debugMode) {
				console.log("Octoprint client info:", message);
			}
			this.opClient.socket.socket.send(
				JSON.stringify({ auth: `${user}:${session}` })
			);
		});

		if (this.config.debugMode) {
			this.opClient.socket.onMessage("*", (message) => {
				// Reference: http://docs.octoprint.org/en/master/api/push.html#sec-api-push-datamodel-currentandhistory
				console.log("Octoprint", message);
			});
		}

		this.opClient.socket.onMessage("history", (message) => {
			this.updateData(message.data);
		});

		this.opClient.socket.onMessage("current", (message) => {
			this.updateData(message.data);
		});
	},

	getScripts: function () {
		return [
			this.file("jquery.min.js"),
			this.file("lodash.min.js"),
			this.file("sockjs.min.js"),
			this.file("packed_client.js"),
			this.file("mjpeg.js"),
		];
	},

	getTranslations: function () {
		return {
			en: "translations/en.json",
			de: "translations/de.json",
			fr: "translations/fr.json",
		};
	},

	processFiles: function (data) {
		this.files = [];
		for (var x in data.files) {
			this.files.push(data.files[x].name);
		}
		this.show(this.config.animationSpeed, { lockString: this.identifier });
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function () {
			self.updateFiles();
		}, nextLoad);
	},

	updateFiles: function () {
		var self = this;

		this.opClient.files.list().done(function (response) {
			self.processFiles(response);
		});
	},

	sendPrint: function (filename) {
		this.opClient.files.select("local", filename, true);
	},

	uploadFile: function (file) {
		var self = this;
		this.opClient.files.upload("local", file).done(function (response) {
			if (response[1] === "success") {
				self.updateFiles();
			} else {
				console.log(response);
			}
		});
	},

	updateData: function (data) {
		//console.log("Updating OctoPrint Data");
		//console.log($("#opState")[0]);
		if (data.state.text.startsWith("Offline (Error: SerialException")) {
			$("#opState")[0].textContent = this.translate("OFFLINE");
		} else if (
			data.state.text.startsWith("Offline (Error: Too many consecutive")
		) {
			$("#opState")[0].textContent = this.translate("OFFLINE");
		} else {
			$("#opState")[0].textContent = data.state.text;
		}

		var icon = $("#opStateIcon")[0];
		if (data.state.flags.printing) {
			icon.innerHTML =
        "<i class=\"fa fa-print\" aria-hidden=\"true\" style=\"color:green;\"></i>";
			if (!this.config.showDetailsWhenOffline) {
				$("#opMoreInfo").show();
			}
		} else if (data.state.flags.closedOrError) {
			icon.innerHTML =
        "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\" style=\"color:red;\"></i>";
			if (!this.config.showDetailsWhenOffline) {
				$("#opMoreInfo").hide();
			}
		} else if (data.state.flags.paused) {
			icon.innerHTML =
        "<i class=\"fa fa-pause\" aria-hidden=\"true\" style=\"color:yellow;\"></i>";
			if (!this.config.showDetailsWhenOffline) {
				$("#opMoreInfo").show();
			}
		} else if (data.state.flags.error) {
			icon.innerHTML =
        "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\" style=\"color:red;\"></i>";
			if (!this.config.showDetailsWhenOffline) {
				$("#opMoreInfo").hide();
			}
		} else if (data.state.flags.ready) {
			icon.innerHTML =
        "<i class=\"fa fa-check-circle\" aria-hidden=\"true\" style=\"color:green;\"></i>";
			if (!this.config.showDetailsWhenOffline) {
				$("#opMoreInfo").show();
			}
		} else if (data.state.flags.operational) {
			icon.innerHTML =
        "<i class=\"fa fa-check-circle\" aria-hidden=\"true\" style=\"color:green;\"></i>";
			if (!this.config.showDetailsWhenOffline) {
				$("#opMoreInfo").show();
			}
		}

		$("#opFile")[0].textContent = data.job.file.name
			? data.job.file.name
			: "N/A";
		$("#opPrintTime")[0].textContent = data.progress.printTime
			? data.progress.printTime.toHHMMSS()
			: "N/A";
		$("#opPrintTimeRemaining")[0].textContent = data.progress.printTimeLeft
			? data.progress.printTimeLeft.toHHMMSS()
			: "N/A";

		var progress = document.getElementById("oProgress");
		progress.setAttribute("value", data.progress.completion);
		var percent = document.getElementById("oPercent");
		percent.innerText = data.progress.completion
			? `${Math.floor(data.progress.completion)}%`
			: "N/A";

		if (this.config.showTemps) {
			if (data.temps.length) {
				var temps = data.temps[data.temps.length - 1];
				if (typeof temps.bed === "undefined") {
					// Sometimes the last data point is time only, so back up 1.
					temps = data.temps[data.temps.length - 2];
				}

				$("#opNozzleTemp")[0].innerHTML = temps.tool0.actual
					? temps.tool0.actual.round10(1) + "&deg;C"
					: "N/A";
				$("#opNozzleTempTgt")[0].innerHTML = temps.tool0.target
					? Math.round(temps.tool0.target) + "&deg;C"
					: "N/A";
				$("#opBedTemp")[0].innerHTML = temps.bed.actual
					? temps.bed.actual.round10(1) + "&deg;C"
					: "N/A";
				$("#opBedTempTgt")[0].innerHTML = temps.bed.target
					? Math.round(temps.bed.target) + "&deg;C"
					: "N/A";
			}
		}
	},

	getStyles: function () {
		return ["octomirror.css", "font-awesome.css"];
	},

	notificationReceived: function (notification) {
		if (notification === "DOM_OBJECTS_CREATED") {
			this.initializeSocket();
			this.scheduleUpdate(1);
		}
	},
});

Number.prototype.toHHMMSS = function () {
	var hours = Math.floor(this / 3600);
	var minutes = Math.floor(this / 60) % 60;
	var seconds = this % 60;
	return [hours, minutes, seconds]
		.map((v) => (v < 10 ? "0" + v : v))
		.filter((v, i) => v !== "00" || i > 0)
		.join(":");
};

Number.prototype.round10 = function (precision) {
	var factor = Math.pow(10, precision);
	var tempNumber = this * factor;
	var roundedTempNumber = Math.round(tempNumber);
	return roundedTempNumber / factor;
};
