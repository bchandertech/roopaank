feature/_
│
│ git push
▼
CI
│
├── Lint ✅
├── Jest ✅
├── Coverage ✅
└── Build ✅
│
▼
Create PR: feature/_ → dev
│
▼
PR Review / Approval ✅
│
▼
Merge → dev
│
▼
QA / Integration Testing (no deploy)
│
│ Testing passed ✅
▼
Create PR: dev → main
│
▼
PR Review / Approval ✅
│
▼
CI
│
├── Lint ✅
├── Jest ✅
├── Coverage ✅
└── Build ✅
│
▼
Merge → main
│
▼
CI passes on main
│
▼
Production CD (deploy job in ci.yml)
│
▼
Vercel Production 🚀
