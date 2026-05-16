# Documentation Index

## 📖 Reading Order

### For Quick Understanding (15 minutes)
1. **[00_START_HERE.md](./00_START_HERE.md)** - Conceptual overview
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Path vs Subdomain explained

### For Implementation (Planning)
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed diagrams
4. **[ROADMAP_SAAS.md](./ROADMAP_SAAS.md)** - Phase-by-phase plan

### For Development
5. **[CLAUDE.md](./CLAUDE.md)** - Dev guidelines
6. **[README_SAAS.md](./README_SAAS.md)** - Project structure

---

## 📚 Document Descriptions

| Document | Purpose | Time |
|----------|---------|------|
| **00_START_HERE.md** | Conceptual intro, problem/solution | 5 min |
| **QUICK_REFERENCE.md** | Path-based vs subdomain, examples | 10 min |
| **ARCHITECTURE.md** | Visual diagrams, database schemas, flows | 20 min |
| **ROADMAP_SAAS.md** | 6 implementation phases with tasks | 30 min |
| **CLAUDE.md** | Dev guidelines, constraints, testing | 10 min |
| **README_SAAS.md** | Project overview, file structure | 5 min |

**Total reading: ~90 minutes for full understanding**

---

## 🎯 Quick Answers

**Q: What's path-based routing?**  
A: Customers access storefronts via URLs like `/merchant/shop1` instead of subdomains.  
→ See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#simple-explanation)

**Q: How does multi-tenancy work?**  
A: Every database record includes `merchantId`, so queries filter by it.  
→ See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#key-concept-merchantid-in-every-query)

**Q: What's the implementation plan?**  
A: 6 phases starting with database models, ending with testing.  
→ See [ROADMAP_SAAS.md](./ROADMAP_SAAS.md)

**Q: How do I start coding?**  
A: Phase 1: Add Merchant model to `src/models/index.ts`.  
→ See [ROADMAP_SAAS.md - Phase 1](./ROADMAP_SAAS.md#phase-1-database--models-next)

**Q: What are the dev guidelines?**  
A: Every query must filter by merchantId, test with 2+ merchants.  
→ See [CLAUDE.md](./CLAUDE.md)

**Q: Can I upgrade to subdomains later?**  
A: Yes! Just update the merchant lookup middleware.  
→ See [QUICK_REFERENCE.md - Future upgrade](./QUICK_REFERENCE.md#future-upgrading-to-subdomain-based)

---

## 🚀 Getting Started

```
1. Read 00_START_HERE.md (conceptual understanding)
   ↓
2. Read QUICK_REFERENCE.md (see examples)
   ↓
3. Skim ARCHITECTURE.md (understand flows)
   ↓
4. Follow ROADMAP_SAAS.md Phase 1 (start coding)
```

---

## 📁 Project Structure

```
lineoa-saas/
├── 📖 DOCS (you're reading these)
│   ├── 00_START_HERE.md          ← Begin here!
│   ├── QUICK_REFERENCE.md        ← See examples
│   ├── ARCHITECTURE.md           ← Deep dive
│   ├── ROADMAP_SAAS.md           ← Implementation
│   ├── CLAUDE.md                 ← Guidelines
│   ├── README_SAAS.md            ← Overview
│   └── DOCS_INDEX.md             ← You are here
│
├── 📁 src/
│   ├── models/index.ts           ← Modify: Add Merchant + merchantId
│   ├── app/
│   │   ├── admin/                ← Old personal code
│   │   ├── shop/                 ← Old personal code
│   │   └── api/                  ← Will refactor & expand
│   └── lib/
│
└── 📁 config
    ├── package.json
    ├── next.config.ts
    └── tsconfig.json
```

---

## ✅ Document Completion Checklist

- [ ] Read 00_START_HERE.md
- [ ] Read QUICK_REFERENCE.md (especially examples)
- [ ] Review ARCHITECTURE.md diagrams
- [ ] Read ROADMAP_SAAS.md Phase 1
- [ ] Read CLAUDE.md for dev guidelines
- [ ] Ready to code? Start Phase 1!

---

## 💾 Personal Project (Untouched)

Your original project is at: `/Users/madeinheaven/Work/lineoa-personal/`

This SaaS version is completely separate: `/Users/madeinheaven/Work/lineoa-saas/`

You can modify this project without affecting the personal one.

---

## 🔗 Cross-References

When a document mentions another:
- Click the markdown link: `[filename](./filename.md)`
- Or use Cmd+Click in VS Code to jump

---

## 📞 Help

**Stuck on conceptual understanding?**  
→ Reread 00_START_HERE.md + QUICK_REFERENCE.md

**Want to see diagrams?**  
→ ARCHITECTURE.md (has ASCII diagrams and flow charts)

**Ready to implement?**  
→ ROADMAP_SAAS.md (has code examples)

**Have dev questions?**  
→ CLAUDE.md (has guidelines and testing instructions)

---

Last updated: 2026-05-13  
Total docs: 7 files  
Total content: ~8,000 words  
Estimated read time: 90 minutes
