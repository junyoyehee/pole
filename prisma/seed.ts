import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.comment.deleteMany();
  await prisma.handoff.deleteMany();
  await prisma.reviewFeedback.deleteMany();
  await prisma.designReview.deleteMany();
  await prisma.figmaProject.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash("password123", 10);

  // ========== Users (20) ==========
  const users = await Promise.all(
    [
      { name: "김민수", email: "minsu.kim@company.com", role: "ADMIN", part: "BACKEND", position: "CTO", status: "WORKING", slackHandle: "@minsu", bio: "백엔드 아키텍처 및 인프라 총괄" },
      { name: "이서연", email: "seoyeon.lee@company.com", role: "ADMIN", part: "PM", position: "VP of Engineering", status: "WORKING", slackHandle: "@seoyeon", bio: "프로젝트 관리 및 팀 운영 담당" },
      { name: "박지훈", email: "jihoon.park@company.com", role: "LEAD", part: "FRONTEND", position: "프론트엔드 리드", status: "WORKING", slackHandle: "@jihoon", bio: "React/Next.js 전문, UI 아키텍처 설계" },
      { name: "최유진", email: "yujin.choi@company.com", role: "LEAD", part: "DESIGN", position: "디자인 리드", status: "IN_MEETING", slackHandle: "@yujin", bio: "UX/UI 디자인 총괄, 디자인 시스템 운영" },
      { name: "정태영", email: "taeyoung.jung@company.com", role: "LEAD", part: "BACKEND", position: "백엔드 리드", status: "WORKING", slackHandle: "@taeyoung", bio: "API 설계 및 데이터베이스 최적화" },
      { name: "한소희", email: "sohee.han@company.com", role: "LEAD", part: "QA", position: "QA 리드", status: "WORKING", slackHandle: "@sohee", bio: "테스트 자동화 및 품질 관리" },
      { name: "윤재석", email: "jaeseok.yoon@company.com", role: "MEMBER", part: "FRONTEND", position: "시니어 프론트엔드 개발자", status: "WORKING", slackHandle: "@jaeseok", bio: "성능 최적화와 접근성에 관심이 많습니다" },
      { name: "강하나", email: "hana.kang@company.com", role: "MEMBER", part: "FRONTEND", position: "프론트엔드 개발자", status: "IN_MEETING", slackHandle: "@hana", bio: "컴포넌트 설계 및 상태관리" },
      { name: "서준호", email: "junho.seo@company.com", role: "MEMBER", part: "FRONTEND", position: "프론트엔드 개발자", status: "WORKING", slackHandle: "@junho.s", bio: "모바일 웹 및 반응형 UI 전문" },
      { name: "임수빈", email: "subin.lim@company.com", role: "MEMBER", part: "FRONTEND", position: "주니어 프론트엔드 개발자", status: "AWAY", slackHandle: "@subin", bio: "신입 개발자, 열심히 배우고 있습니다" },
      { name: "오현우", email: "hyunwoo.oh@company.com", role: "MEMBER", part: "BACKEND", position: "시니어 백엔드 개발자", status: "WORKING", slackHandle: "@hyunwoo", bio: "마이크로서비스 및 메시지 큐 전문" },
      { name: "배다은", email: "daeun.bae@company.com", role: "MEMBER", part: "BACKEND", position: "백엔드 개발자", status: "WORKING", slackHandle: "@daeun", bio: "Node.js/Prisma 기반 API 개발" },
      { name: "송지원", email: "jiwon.song@company.com", role: "MEMBER", part: "BACKEND", position: "백엔드 개발자", status: "VACATION", slackHandle: "@jiwon", bio: "인증/보안 모듈 담당" },
      { name: "조예린", email: "yerin.jo@company.com", role: "MEMBER", part: "DESIGN", position: "시니어 UX 디자이너", status: "WORKING", slackHandle: "@yerin", bio: "사용자 리서치 및 인터랙션 디자인" },
      { name: "문성호", email: "sungho.moon@company.com", role: "MEMBER", part: "DESIGN", position: "UI 디자이너", status: "WORKING", slackHandle: "@sungho", bio: "비주얼 디자인 및 모션 그래픽" },
      { name: "양미래", email: "mirae.yang@company.com", role: "MEMBER", part: "DESIGN", position: "주니어 디자이너", status: "WORKING", slackHandle: "@mirae", bio: "아이콘 및 일러스트레이션 제작" },
      { name: "신동현", email: "donghyun.shin@company.com", role: "MEMBER", part: "PM", position: "프로젝트 매니저", status: "IN_MEETING", slackHandle: "@donghyun", bio: "애자일 스크럼 마스터, 일정 관리" },
      { name: "류하영", email: "hayoung.ryu@company.com", role: "MEMBER", part: "PM", position: "프로덕트 매니저", status: "WORKING", slackHandle: "@hayoung", bio: "제품 기획 및 사용자 분석" },
      { name: "권태윤", email: "taeyoon.kwon@company.com", role: "MEMBER", part: "QA", position: "QA 엔지니어", status: "WORKING", slackHandle: "@taeyoon", bio: "E2E 테스트 자동화 담당" },
      { name: "홍세진", email: "sejin.hong@company.com", role: "MEMBER", part: "QA", position: "QA 엔지니어", status: "AWAY", slackHandle: "@sejin", bio: "성능 테스트 및 모니터링" },
    ].map((u) =>
      prisma.user.create({
        data: {
          ...u,
          passwordHash,
        },
      })
    )
  );

  // Helper to find user by name
  const u = (name: string) => users.find((user) => user.name === name)!;

  // ========== FigmaProjects (4) ==========
  const figmaProjects = await Promise.all([
    prisma.figmaProject.create({
      data: {
        name: "미르M 메인 화면 리디자인",
        figmaUrl: "https://www.figma.com/design/abc123/mirm-main-redesign",
        fileKey: "abc123",
        description: "미르M 플랫폼 메인 페이지 전면 리디자인",
        status: "IN_DEV",
        designerId: u("조예린").id,
        thumbnailUrl: "https://figma-thumbnails.example.com/mirm-main.png",
      },
    }),
    prisma.figmaProject.create({
      data: {
        name: "관리자 대시보드 UI",
        figmaUrl: "https://www.figma.com/design/def456/admin-dashboard",
        fileKey: "def456",
        description: "어드민 대시보드 전체 UI 디자인",
        status: "IN_REVIEW",
        designerId: u("문성호").id,
        thumbnailUrl: "https://figma-thumbnails.example.com/admin-dash.png",
      },
    }),
    prisma.figmaProject.create({
      data: {
        name: "디자인 시스템 v2 컴포넌트",
        figmaUrl: "https://www.figma.com/design/ghi789/design-system-v2",
        fileKey: "ghi789",
        description: "디자인 시스템 v2 컴포넌트 라이브러리",
        status: "DESIGNING",
        designerId: u("최유진").id,
        thumbnailUrl: "https://figma-thumbnails.example.com/ds-v2.png",
      },
    }),
    prisma.figmaProject.create({
      data: {
        name: "모바일 앱 와이어프레임",
        figmaUrl: "https://www.figma.com/design/jkl012/mobile-wireframe",
        fileKey: "jkl012",
        description: "모바일 앱 MVP 와이어프레임 및 프로토타입",
        status: "DESIGNING",
        designerId: u("조예린").id,
        thumbnailUrl: "https://figma-thumbnails.example.com/mobile-wf.png",
      },
    }),
  ]);

  // ========== DesignReviews (5) ==========
  const reviews = await Promise.all([
    prisma.designReview.create({
      data: {
        figmaProjectId: figmaProjects[0].id,
        title: "메인 히어로 섹션 리뷰",
        description: "메인 페이지 히어로 영역 디자인 리뷰 요청",
        figmaNodeId: "1:234",
        status: "APPROVED",
        authorId: u("조예린").id,
        dueDate: "2026-03-10",
      },
    }),
    prisma.designReview.create({
      data: {
        figmaProjectId: figmaProjects[0].id,
        title: "네비게이션 바 개선안",
        description: "GNB 구조 변경 및 모바일 대응 리뷰",
        figmaNodeId: "1:567",
        status: "IN_REVISION",
        authorId: u("조예린").id,
        dueDate: "2026-03-18",
      },
    }),
    prisma.designReview.create({
      data: {
        figmaProjectId: figmaProjects[1].id,
        title: "대시보드 레이아웃 초안",
        description: "관리자 대시보드 메인 레이아웃 1차 리뷰",
        figmaNodeId: "2:100",
        status: "OPEN",
        authorId: u("문성호").id,
        dueDate: "2026-03-20",
      },
    }),
    prisma.designReview.create({
      data: {
        figmaProjectId: figmaProjects[2].id,
        title: "Button 컴포넌트 variants",
        description: "버튼 컴포넌트 모든 variant 및 상태 디자인 리뷰",
        figmaNodeId: "3:50",
        status: "APPROVED",
        authorId: u("최유진").id,
        dueDate: "2026-03-05",
      },
    }),
    prisma.designReview.create({
      data: {
        figmaProjectId: figmaProjects[2].id,
        title: "Input 컴포넌트 디자인",
        description: "텍스트 입력 컴포넌트 디자인 리뷰 (validation states 포함)",
        figmaNodeId: "3:80",
        status: "OPEN",
        authorId: u("최유진").id,
        dueDate: "2026-03-22",
      },
    }),
  ]);

  // ========== ReviewFeedbacks ==========
  await Promise.all([
    prisma.reviewFeedback.create({
      data: {
        reviewId: reviews[0].id,
        authorId: u("박지훈").id,
        content: "히어로 이미지 로딩 시 레이아웃 시프트가 발생할 수 있어요. aspect-ratio 고정이 필요합니다.",
        category: "TECHNICAL",
        priority: "HIGH",
        type: "CHANGE_REQUEST",
      },
    }),
    prisma.reviewFeedback.create({
      data: {
        reviewId: reviews[0].id,
        authorId: u("류하영").id,
        content: "CTA 버튼 위치가 좋네요. 전환율 개선에 도움이 될 것 같습니다.",
        category: "UX",
        priority: "NORMAL",
        type: "APPROVAL",
      },
    }),
    prisma.reviewFeedback.create({
      data: {
        reviewId: reviews[1].id,
        authorId: u("윤재석").id,
        content: "모바일에서 햄버거 메뉴 열릴 때 포커스 트래핑 처리가 필요합니다.",
        category: "A11Y",
        priority: "HIGH",
        type: "CHANGE_REQUEST",
      },
    }),
    prisma.reviewFeedback.create({
      data: {
        reviewId: reviews[2].id,
        authorId: u("강하나").id,
        content: "차트 영역 그리드 비율이 다양한 데이터에 대해 유연하게 대응 가능한가요?",
        category: "UI",
        priority: "NORMAL",
        type: "COMMENT",
      },
    }),
    prisma.reviewFeedback.create({
      data: {
        reviewId: reviews[3].id,
        authorId: u("서준호").id,
        content: "Mantine Button과의 API 호환성이 잘 유지되어 있습니다. LGTM!",
        category: "TECHNICAL",
        priority: "NORMAL",
        type: "APPROVAL",
      },
    }),
    prisma.reviewFeedback.create({
      data: {
        reviewId: reviews[4].id,
        authorId: u("한소희").id,
        content: "에러 상태 텍스트의 색상 대비가 WCAG AA 기준을 충족하는지 확인 필요합니다.",
        category: "A11Y",
        priority: "HIGH",
        type: "CHANGE_REQUEST",
      },
    }),
  ]);

  // ========== Handoffs (6) ==========
  await Promise.all([
    prisma.handoff.create({
      data: {
        figmaProjectId: figmaProjects[0].id,
        componentName: "HeroSection",
        figmaNodeId: "1:234",
        figmaUrl: "https://www.figma.com/design/abc123?node-id=1:234",
        developerId: u("박지훈").id,
        status: "IN_PROGRESS",
        priority: "HIGH",
        specData: JSON.stringify({ width: "100%", maxWidth: "1200px", padding: "60px 24px" }),
        notes: "이미지 최적화 필요. WebP 포맷 사용 권장",
      },
    }),
    prisma.handoff.create({
      data: {
        figmaProjectId: figmaProjects[0].id,
        componentName: "NavigationBar",
        figmaNodeId: "1:567",
        figmaUrl: "https://www.figma.com/design/abc123?node-id=1:567",
        developerId: u("윤재석").id,
        status: "PENDING",
        priority: "HIGH",
        specData: JSON.stringify({ height: "64px", breakpoint: "768px" }),
        notes: "모바일 메뉴 애니메이션 Figma 프로토타입 참고",
      },
    }),
    prisma.handoff.create({
      data: {
        figmaProjectId: figmaProjects[1].id,
        componentName: "StatsCard",
        figmaNodeId: "2:110",
        figmaUrl: "https://www.figma.com/design/def456?node-id=2:110",
        developerId: u("강하나").id,
        status: "IMPLEMENTED",
        priority: "NORMAL",
        specData: JSON.stringify({ minWidth: "280px", borderRadius: "12px" }),
        notes: "숫자 애니메이션 countUp 라이브러리 사용",
      },
    }),
    prisma.handoff.create({
      data: {
        figmaProjectId: figmaProjects[1].id,
        componentName: "DataTable",
        figmaNodeId: "2:200",
        figmaUrl: "https://www.figma.com/design/def456?node-id=2:200",
        developerId: u("강하나").id,
        status: "IN_PROGRESS",
        priority: "NORMAL",
        specData: JSON.stringify({ rowHeight: "48px", headerHeight: "56px" }),
        notes: "가상 스크롤 적용 필요 (1000행 이상 데이터)",
      },
    }),
    prisma.handoff.create({
      data: {
        figmaProjectId: figmaProjects[2].id,
        componentName: "Button",
        figmaNodeId: "3:50",
        figmaUrl: "https://www.figma.com/design/ghi789?node-id=3:50",
        developerId: u("서준호").id,
        status: "VERIFIED",
        priority: "HIGH",
        specData: JSON.stringify({ sizes: ["xs", "sm", "md", "lg"], variants: ["filled", "outline", "subtle", "ghost"] }),
        notes: "Mantine Button 확장. 커스텀 variant 추가",
      },
    }),
    prisma.handoff.create({
      data: {
        figmaProjectId: figmaProjects[2].id,
        componentName: "TextInput",
        figmaNodeId: "3:80",
        figmaUrl: "https://www.figma.com/design/ghi789?node-id=3:80",
        developerId: u("박지훈").id,
        status: "PENDING",
        priority: "NORMAL",
        specData: JSON.stringify({ height: "40px", labelGap: "4px" }),
        notes: "validation 상태별 스타일 구현 필요",
      },
    }),
  ]);

  console.log("Seeding completed successfully!");
  console.log(`  - Users: 20`);
  console.log(`  - FigmaProjects: 4`);
  console.log(`  - DesignReviews: 5`);
  console.log(`  - ReviewFeedbacks: 6`);
  console.log(`  - Handoffs: 6`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
