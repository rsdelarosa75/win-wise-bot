import { Share } from '@capacitor/share';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

const APP_STORE_URL = 'https://apps.apple.com/app/id6767071941';

interface SharePickButtonProps {
  matchup: string;
  pick: string;
  confidence: string;
  edgeNote?: string;
}

export function SharePickButton({ matchup, pick, confidence, edgeNote }: SharePickButtonProps) {
  const handleShare = async () => {
    const lines = [
      `🎯 Bobby Vegas Pick: ${matchup}`,
      `${pick} | Confidence: ${confidence}`,
    ];
    if (edgeNote) lines.push(edgeNote);
    lines.push('', 'Get your own AI-powered picks:');

    try {
      await Share.share({
        title: 'Bobby Vegas Pick',
        text: lines.join('\n'),
        url: APP_STORE_URL,
        dialogTitle: 'Share this pick',
      });
    } catch (err) {
      // Share.share() rejects if the user cancels the native sheet —
      // this is expected, not an error. Swallow it silently.
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      <Share2 className="w-4 h-4 mr-2" />
      Share
    </Button>
  );
}
