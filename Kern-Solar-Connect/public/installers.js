const installerRail = document.querySelector('#installer-rail');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateInstallerMotion() {
  installerRail.dataset.motion = motionPreference.matches ? 'paused' : 'running';
}
motionPreference.addEventListener('change',updateInstallerMotion);
updateInstallerMotion();
