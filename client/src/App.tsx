import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useNotificationSocket } from "./hooks/useNotificationSocket";
import { LoginPage } from "./pages/LoginPage";
import { MyPostsPage } from "./pages/MyPostsPage";
import { PostCreatePage } from "./pages/PostCreatePage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { PostListPage } from "./pages/PostListPage";
import { RegisterPage } from "./pages/RegisterPage";

/**
 * 앱 루트. `useNotificationSocket`은 라우트가 바뀌어도 언마운트되지 않도록
 * 이 컴포넌트(Router 내부, Routes 밖)에서 딱 1회만 호출한다(PLAN B-3).
 */
export default function App() {
  useNotificationSocket();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<PostListPage />} />
          <Route path="/my-posts" element={<MyPostsPage />} />
          <Route path="/posts/new" element={<PostCreatePage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
