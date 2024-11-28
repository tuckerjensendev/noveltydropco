// shutdownState.js
let shutdownInProgress = false;

const getShutdownState = () => shutdownInProgress;

const setShutdownState = (state) => {
  shutdownInProgress = state;
};

module.exports = { getShutdownState, setShutdownState };
