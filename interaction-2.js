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

const dspName = "engine";
const instance = new FaustWasm2ScriptProcessor(dspName);

// output to window or npm package module
if (typeof module === "undefined") {
    window[dspName] = instance;
} else {
    const exp = {};
    exp[dspName] = instance;
    module.exports = exp;
}

engine.createDSP(audioContext, 1024)
    .then(node => {
        dspNode = node;
        dspNode.connect(audioContext.destination);
        console.log('params: ', dspNode.getParams());
        const jsonString = dspNode.getJSON();
        jsonParams = JSON.parse(jsonString)["ui"][0]["items"];
        dspNodeParams = jsonParams
        // A short ramp makes the engine react quickly to changes in spin speed.
        dspNode.setParamValue("/engine/runtime", 0.15);
        dspNode.setParamValue("/engine/volume", 1);
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

function accelerationChange(accx, accy, accz) {
    // playAudio()
}

let previousRotationZ = null;
let previousRotationTime = null;
let smoothedSpinSpeed = 0;
let manualEngineUntil = 0;
let engineRunning = false;

const flatAngleLimit = 20;
const spinStartThreshold = 40;
const spinStopThreshold = 20;
const fullSpeedAt = 240;

function rotationChange(rotx, roty, rotz) {
    if (!Number.isFinite(rotx) || !Number.isFinite(roty) || !Number.isFinite(rotz)) {
        return;
    }

    const now = millis();
    if (now < manualEngineUntil) {
        return;
    }

    const isFlat = Math.abs(rotx) <= flatAngleLimit && Math.abs(roty) <= flatAngleLimit;

    if (!isFlat) {
        previousRotationZ = null;
        previousRotationTime = null;
        smoothedSpinSpeed = 0;
        engineRunning = false;
        playAudio(0);
        return;
    }

    if (previousRotationZ === null || previousRotationTime === null) {
        previousRotationZ = rotz;
        previousRotationTime = now;
        playAudio(0);
        return;
    }

    const elapsedSeconds = (now - previousRotationTime) / 1000;
    if (elapsedSeconds <= 0) {
        return;
    }

    // Use the shortest angular distance so crossing 359 -> 0 degrees stays smooth.
    const angleDelta = ((rotz - previousRotationZ + 540) % 360) - 180;
    const spinSpeed = Math.min(Math.abs(angleDelta) / elapsedSeconds, 720);
    smoothedSpinSpeed = 0.75 * smoothedSpinSpeed + 0.25 * spinSpeed;

    // Hysteresis prevents sensor noise near the boundary from clicking the gate on and off.
    if (!engineRunning && smoothedSpinSpeed >= spinStartThreshold) {
        engineRunning = true;
    } else if (engineRunning && smoothedSpinSpeed <= spinStopThreshold) {
        engineRunning = false;
    }

    const activity = engineRunning
        ? constrain(
            (smoothedSpinSpeed - spinStopThreshold) / (fullSpeedAt - spinStopThreshold),
            0,
            1
        )
        : 0;

    if (activity > 0) {
        turntimer = now;
        statusLabels[1].style("color", "pink");
    }

    playAudio(activity);
    previousRotationZ = rotz;
    previousRotationTime = now;
}

function mousePressed() {
    manualEngineUntil = millis() + 2000;
    playAudio(0.7);
    setTimeout(() => playAudio(0), 2000);
    // Use this for debugging from the desktop!
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

function playAudio(activity) {
    if (!dspNode) {
        return;
    }
    if (audioContext.state === 'suspended') {
        return;
    }
    const safeActivity = constrain(Number(activity) || 0, 0, 1);

    if (safeActivity > 0) {
        dspNode.setParamValue("/engine/maxSpeed", safeActivity);
        dspNode.setParamValue("/engine/gate", 1);
    } else {
        // Keep the last speed while the DSP envelope fades out to avoid an abrupt click.
        dspNode.setParamValue("/engine/gate", 0);
    }
}

//==========================================================================================
// END
//==========================================================================================
