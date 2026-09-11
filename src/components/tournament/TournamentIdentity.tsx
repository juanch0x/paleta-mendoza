import type { ClubId } from "@/data/clubs";
import ClubMark from "./ClubMark";

type Props = {
  eyebrow: string;
  edition: string;
  hostClubName: string;
  clubId: ClubId;
  headingLevel?: 1 | 2;
};

export default function TournamentIdentity({
  eyebrow,
  edition,
  hostClubName,
  clubId,
  headingLevel = 2,
}: Props) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <div>
      <p className="text-accent text-xs font-semibold tracking-[0.18em] uppercase">
        {eyebrow}
      </p>
      <div className="mt-3 flex items-center gap-4">
        <ClubMark clubId={clubId} />
        <div>
          <Heading className="text-xl font-bold sm:text-2xl">{edition}</Heading>
          <p className="text-foreground/75 mt-0.5 text-base font-medium">
            {hostClubName}
          </p>
        </div>
      </div>
    </div>
  );
}
