/* eslint-disable @typescript-eslint/no-explicit-any */
import { serverFetch } from "../../lib/api";
import ExamQuestionsView from "./ExamQuestionsView";

async function getExamQuestions(searchParams: {
  [key: string]: string | string[] | undefined;
}) {
  const params = new URLSearchParams();

  if ((await searchParams).year)
    params.append("year", (await searchParams).year as string);
  if ((await searchParams).examType)
    params.append("examType", (await searchParams).examType as string);
  if ((await searchParams).lesson)
    params.append("lesson", (await searchParams).lesson as string);
  if ((await searchParams).topic)
    params.append("topic", (await searchParams).topic as string);
  if ((await searchParams).analysisStatus)
    params.append(
      "analysisStatus",
      (await searchParams).analysisStatus as string,
    );
  if ((await searchParams).sortBy)
    params.append("sortBy", (await searchParams).sortBy as string);
  if ((await searchParams).sortOrder)
    params.append("sortOrder", (await searchParams).sortOrder as string);
  if ((await searchParams).createdAfter)
    params.append("createdAfter", (await searchParams).createdAfter as string);
  if ((await searchParams).createdBefore)
    params.append("createdBefore", (await searchParams).createdBefore as string);
  if ((await searchParams).updatedAfter)
    params.append("updatedAfter", (await searchParams).updatedAfter as string);
  if ((await searchParams).updatedBefore)
    params.append("updatedBefore", (await searchParams).updatedBefore as string);
  if ((await searchParams).page)
    params.append("page", (await searchParams).page as string);
  if ((await searchParams).limit)
    params.append("limit", (await searchParams).limit as string);

  const queryString = (await params).toString();
  const response = await serverFetch<{
    success: boolean;
    examQuestions: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`/admin/exam-questions${queryString ? `?${queryString}` : ""}`);

  return response;
}

export default async function ExamQuestionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const data = await getExamQuestions(searchParams);

  return <ExamQuestionsView initialData={data} />;
}
