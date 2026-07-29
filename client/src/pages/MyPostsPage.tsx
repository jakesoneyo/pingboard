import { usePosts } from "../hooks/usePosts";
import { PostCard } from "../components/PostCard";
import { useAuthStore } from "../stores/auth.store";

/**
 * "내 글" 탭. 백엔드에 작성자 필터 전용 엔드포인트가 없어(API.md 4장 — `GET /posts`는
 * 전체 목록만 제공) 서버 최대 페이지 크기(50)를 가져와 클라이언트에서 필터링한다.
 * S 티어 스코프의 트레이드오프: 게시글이 50건을 넘으면 오래된 "내 글"이 이 페이지에서
 * 누락될 수 있다 — 데모 규모에서는 문제되지 않는다.
 */
export function MyPostsPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = usePosts(1, 50);

  const myPosts =
    data?.items.filter((post) => post.author.id === user?.id) ?? [];

  return (
    <div>
      <h1 className="mb-4 text-lg font-extrabold text-ink">내 글</h1>

      {isLoading && <p className="text-sm text-ink/50">불러오는 중…</p>}

      {!isLoading && myPosts.length === 0 && (
        <p className="text-sm text-ink/50">아직 작성한 글이 없습니다.</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {myPosts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </div>
  );
}
