import Image from "next/image";
import { Badge } from "@/components/ui/badge";

function BoothCard({
  name,
  description,
  imageUrl,
  imageAlt,
}: {
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
}) {
  return (
    <div>
      <Badge variant="destructive">混雑度</Badge>
      <div>{name}</div>
      <div>{description}</div>
      <Image alt={imageAlt} src={imageUrl}></Image>
    </div>
  );
}

export { BoothCard };
