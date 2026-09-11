import { clubs, type ClubId } from "@/data/clubs";

type Props = {
  clubId: ClubId;
};

export default function ClubMark({ clubId }: Props) {
  const club = clubs[clubId];

  return (
    <span
      className={`inline-flex size-18 shrink-0 items-center justify-center rounded-full border ${club.markClassName}`}
    >
      <img
        src={club.logo}
        alt={`Escudo de ${club.name}`}
        className="size-full object-contain"
      />
    </span>
  );
}
