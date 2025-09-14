import { Card } from '@/components/ui/card';
import { User, VideoOff, MicOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type VideoPlayerProps = {
  isLocal: boolean;
  isVideoOn: boolean;
  isMuted?: boolean;
};

export default function VideoPlayer({ isLocal, isVideoOn, isMuted = false }: VideoPlayerProps) {
  return (
    <Card className="w-full h-full bg-muted/40 overflow-hidden relative flex items-center justify-center">
      {!isVideoOn ? (
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <VideoOff size={48} />
          <p className="font-medium">Video is off</p>
        </div>
      ) : (
         <User size={96} className="text-muted-foreground/50" />
      )}
      
      <div className="absolute top-2 left-2 flex items-center gap-2">
        <Badge variant={isLocal ? "default" : "secondary"}>
          {isLocal ? 'You' : 'Stranger'}
        </Badge>
        {isMuted && <MicOff className="w-4 h-4 text-destructive" />}
      </div>
    </Card>
  );
}
