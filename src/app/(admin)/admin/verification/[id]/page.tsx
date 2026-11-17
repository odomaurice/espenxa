import KycReview from "@/components/admin/KycReview";

export default async function Page(props: PageProps<"/admin/verification/[id]">) {
  const { id } = await props.params;
  return <KycReview userId={id} />;
}
