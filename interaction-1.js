//==========================================================================================
// AUDIO SETUP
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit just where you're asked to!
//------------------------------------------------------------------------------------------
//
//==========================================================================================
let dspNode = null;
let dspNodeParams = null;
let jsonParams = null;

const dspName = "torpedo";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

torpedo.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams
        // const exampleMinMaxParam = findByAddress(dspNodeParams, "/thunder/rumble");
        // // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
        // const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
        // console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    });


//==========================================================================================
// INTERACTIONS
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit the next functions to create interactions
// Decide which parameters you're using and then use playAudio to play the Audio
//------------------------------------------------------------------------------------------
//
//==========================================================================================

let isLaunchOrientation = false;
let launchArmed = false;
let launchSettleStart = null;
let lastLaunchTime = -Infinity;

const upwardAccelerationThreshold = 3;
const settleAccelerationLimit = 1.5;
const launchSettleMs = 300;
const launchCooldownMs = 800;

function accelerationChange(accx, accy, accz) {
    if (!Number.isFinite(accx) || !Number.isFinite(accy) || !Number.isFinite(accz)) {
        return;
    }

    const now = millis();
    const dspIsRunning = dspNode && audioContext.state === 'running';

    // Opening the DSP or entering the launch pose never fires by itself.
    // The phone must first be steady before a new upward gesture is armed.
    if (!dspIsRunning || !isLaunchOrientation) {
        launchArmed = false;
        launchSettleStart = null;
        return;
    }

    const accelerationMagnitude = Math.hypot(accx, accy, accz);

    if (!launchArmed) {
        if (accelerationMagnitude <= settleAccelerationLimit) {
            if (launchSettleStart === null) {
                launchSettleStart = now;
            } else if (now - launchSettleStart >= launchSettleMs) {
                launchArmed = true;
            }
        } else {
            launchSettleStart = null;
        }
        return;
    }

    // Device +Y points towards the top edge of a portrait phone.
    if (accy >= upwardAccelerationThreshold
        && now - lastLaunchTime >= launchCooldownMs) {
        lastLaunchTime = now;
        launchArmed = false;
        launchSettleStart = null;
        movetimer = now;
        statusLabels[2].style("color", "pink");
        playAudio();
    }
}

function rotationChange(rotx, roty, rotz) {
    if (!Number.isFinite(rotx) || !Number.isFinite(roty)) {
        isLaunchOrientation = false;
        return;
    }

    // Rotation only validates the launch pose; it does not trigger sound.
    isLaunchOrientation = Math.abs(rotx - 90) <= 25 && Math.abs(roty) <= 30;
}

function mousePressed() {
    // Intentionally empty: clicking Turn On DSP must not launch a torpedo.
}

function deviceMoved() {
    movetimer = millis();
    statusLabels[2].style("color", "pink");
}

function deviceTurned() {
    threshVals[1] = turnAxis;
}
function deviceShaken() {
    shaketimer = millis();
    statusLabels[0].style("color", "pink");
}

function getMinMaxParam(address) {
    const exampleMinMaxParam = findByAddress(dspNodeParams, address);
    // ALWAYS PAY ATTENTION TO MIN AND MAX, ELSE YOU MAY GET REALLY HIGH VOLUMES FROM YOUR SPEAKERS
    const [exampleMinValue, exampleMaxValue] = getParamMinMax(exampleMinMaxParam);
    console.log('Min value:', exampleMinValue, 'Max value:', exampleMaxValue);
    return [exampleMinValue, exampleMaxValue]
}

//==========================================================================================
// AUDIO INTERACTION
//------------------------------------------------------------------------------------------
//
//------------------------------------------------------------------------------------------
// Edit here to define your audio controls 
//------------------------------------------------------------------------------------------
//
//==========================================================================================

function playAudio() {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }

    dspNode.setParamValue("/torpedo/trigger", 1);
    setTimeout(() => { dspNode.setParamValue("/torpedo/trigger", 0); }, 100);
}

//==========================================================================================
// END
//==========================================================================================
