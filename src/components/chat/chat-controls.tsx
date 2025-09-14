import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Flag, Volume2, VolumeX } from 'lucide-react';

type ChatControlsProps = {
  onMuteToggle: () => void;
  onVideoToggle: () => void;
  onSoundToggle: () => void;
  onEndCall: () => void;
  onReport: () => void;
  isMicOn: boolean;
  isVideoOn: boolean;
  isSoundOn: boolean;
};

export default function ChatControls({
  onMuteToggle,
  onVideoToggle,
  onSoundToggle,
  onEndCall,
  onReport,
  isMicOn,
  isVideoOn,
  isSoundOn,
}: ChatControlsProps) {
  return (
    <div className="p-4 bg-card rounded-lg shadow-md flex justify-around items-center">
      <Button variant="ghost" size="icon" onClick={onMuteToggle} aria-label={isMicOn ? "Mute" : "Unmute"}>
        {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6 text-destructive" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onVideoToggle} aria-label={isVideoOn ? "Turn off video" : "Turn on video"}>
        {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6 text-destructive" />}
      </Button>
      <Button
        variant="destructive"
        size="icon"
        className="w-16 h-16 rounded-full animate-gentle-pulse"
        onClick={onEndCall}
        aria-label="End call"
      >
        <PhoneOff className="w-8 h-8" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onSoundToggle} aria-label={isSoundOn ? "Mute sounds" : "Unmute sounds"}>
        {isSoundOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onReport} aria-label="Report user">
        <Flag className="w-6 h-6" />
      </Button>
    </div>
  );
}
