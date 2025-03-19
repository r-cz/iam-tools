import { useState } from "react";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface TokenSizeProps {
  token: string;
}

export function TokenSize({ token }: TokenSizeProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Split token into parts
  const parts = token.split('.');
  const headerPart = parts.length >= 1 ? parts[0] : '';
  const payloadPart = parts.length >= 2 ? parts[1] : '';
  const signaturePart = parts.length === 3 ? parts[2] : '';
  
  // Calculate encoded sizes (in bytes as they appear in the JWT string)
  const headerSize = new Blob([headerPart]).size;
  const payloadSize = new Blob([payloadPart]).size;
  const signatureSize = new Blob([signaturePart]).size;
  const totalSize = new Blob([token]).size;
  
  // Utility function to handle base64url decoding
  const base64UrlDecode = (str: string) => {
    // Convert base64url to base64 by replacing characters and adding padding if needed
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    return atob(base64 + padding);
  };
  
  // Calculate decoded sizes (actual JSON after base64 decoding)
  let decodedHeader = {};
  let decodedPayload = {};
  
  try {
    decodedHeader = headerPart ? JSON.parse(base64UrlDecode(headerPart)) : {};
  } catch (e) {
    console.error('Error decoding header:', e);
  }
  
  try {
    decodedPayload = payloadPart ? JSON.parse(base64UrlDecode(payloadPart)) : {};
  } catch (e) {
    console.error('Error decoding payload:', e);
  }
  
  const decodedHeaderSize = new Blob([JSON.stringify(decodedHeader)]).size;
  const decodedPayloadSize = new Blob([JSON.stringify(decodedPayload)]).size;
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors">
        <span className="text-sm font-medium">Token Size: {totalSize} bytes</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <Card>
          <CardContent className="p-3 text-sm">
            <div className="mb-2 font-medium border-b pb-1">Encoded Size (JWT Format)</div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="font-medium">Header:</div>
              <div>{headerSize} bytes ({Math.round(headerSize/totalSize*100)}%)</div>
              <div className="font-medium">Payload:</div>
              <div>{payloadSize} bytes ({Math.round(payloadSize/totalSize*100)}%)</div>
              <div className="font-medium">Signature:</div>
              <div>{signatureSize} bytes ({Math.round(signatureSize/totalSize*100)}%)</div>
            </div>
            
            <div className="mb-2 font-medium border-b pb-1">Decoded Size (JSON)</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="font-medium">Header JSON:</div>
              <div>{decodedHeaderSize} bytes</div>
              <div className="font-medium">Payload JSON:</div>
              <div>{decodedPayloadSize} bytes</div>
              <div className="font-medium">Total Decoded Data:</div>
              <div>{decodedHeaderSize + decodedPayloadSize} bytes</div>
              <div className="font-medium">Base64 Encoding Overhead:</div>
              <div>
                {totalSize - (decodedHeaderSize + decodedPayloadSize)} bytes 
                ({Math.round((totalSize - (decodedHeaderSize + decodedPayloadSize))/totalSize*100)}%)
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
