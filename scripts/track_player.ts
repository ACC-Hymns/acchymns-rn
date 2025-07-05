import TrackPlayer, { Event } from 'react-native-track-player';

export const PlaybackService = async function() {

    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());

    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

    TrackPlayer.addEventListener(Event.RemoteJumpForward, () => TrackPlayer.seekBy(15))

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => TrackPlayer.seekBy(-15))
};