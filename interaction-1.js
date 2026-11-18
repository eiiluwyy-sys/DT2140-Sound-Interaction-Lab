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

function accelerationChange(accx, accy, accz) {
    // playAudio()
}

let wasPointingUp = false;
let lastLaunchTime = -Infinity;
const launchCooldownMs = 800;

function rotationChange(rotx, roty, rotz) {
    if (!Number.isFinite(rotx) || !Number.isFinite(roty)) {
        return;
    }

    // Keep the pose armed until the DSP has been enabled by the user.
    if (!dspNode || audioContext.state === 'suspended') {
        wasPointingUp = false;
        return;
    }

    // Portrait and nearly vertical: the phone's top edge points upwards.
    const isPointingUp = Math.abs(Math.abs(rotx) - 90) <= 25 && Math.abs(roty) <= 30;
    const now = millis();

    // Fire once when entering the upright pose. Lowering the phone re-arms it.
    if (isPointingUp && !wasPointingUp && now - lastLaunchTime >= launchCooldownMs) {
        lastLaunchTime = now;
        turntimer = now;
        statusLabels[1].style("color", "pink");
        playAudio();
    }

    wasPointingUp = isPointingUp;
}

function mousePressed() {
    playAudio()
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
