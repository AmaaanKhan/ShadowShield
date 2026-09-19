(() => {
    console.log("ShadowShield injection layer active.");

    const reportDetection = (api, category) => {
        window.postMessage(
            {
                source: "ShadowShield",
                type: "fingerprint",
                api,
                category
            },
            "*"
        );
    };

    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

    HTMLCanvasElement.prototype.toDataURL = function (...args) {
        reportDetection("Canvas.toDataURL", "Canvas");

        return originalToDataURL.apply(this, args);
    };

    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (...args) {
        if (args[0] === "webgl" || args[0] === "webgl2") {
            reportDetection(
                `Canvas.getContext(${args[0]})`,
                "WebGL"
            );
        }

        return originalGetContext.apply(this, args);
    };
})();