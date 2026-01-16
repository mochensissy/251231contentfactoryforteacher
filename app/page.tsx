"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileEdit, FolderOpen, TrendingUp, Users, FileText, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

const features = [
  {
    title: "深度选题分析",
    description: "基于大数据洞察全网趋势，精准定位爆款选题。",
    icon: BarChart3,
    link: "/topic-analysis",
    highlight: "数据驱动"
  },
  {
    title: "智能内容创作",
    description: "AI 辅助从大纲到正文撰写，一键生成多风格视频脚本。",
    icon: FileEdit,
    link: "/content-creation",
    highlight: "10x 效率"
  },
  {
    title: "多渠道管理",
    description: "统一管理公众号、小红书等文章资产，构建个人知识库。",
    icon: FolderOpen,
    link: "/publish-management",
    highlight: "矩阵运营"
  }
]

export default function Home() {
  const scrollToFeatures = () => {
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute top-0 z-[-2] h-screen w-screen bg-[radial-gradient(100%_50%_at_50%_0%,rgba(0,163,255,0.08)_0,rgba(0,163,255,0)_50%,rgba(0,163,255,0)_100%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[80px] rounded-full -z-10" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-medium mb-6 animate-fade-in-up hover:bg-primary/10 transition-colors cursor-default">
            <Sparkles className="w-3 h-3" />
            <span>AI 驱动的内容创作新范式</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-primary mb-4 drop-shadow-sm bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent leading-tight">
            闻思修 / 智创平台
          </h1>
          <p className="text-muted-foreground mt-4 text-lg max-w-2xl mx-auto font-serif leading-relaxed">
            以智慧驱动创作，让灵感自然流淌。一站式解决从选题到分发的全流程需求。
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/content-creation">
              <Button size="lg" className="rounded-full px-8 h-10 text-base shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-105">
                开始创作 <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-10 text-base hover:bg-secondary/50 backdrop-blur-sm border-primary/20 hover:border-primary/40 transition-all duration-300"
              onClick={scrollToFeatures}
            >
              了解更多
            </Button>
          </div>
        </motion.div>

        {/* Compact Features Grid */}
        <div id="features" className="scroll-mt-20">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-5 md:grid-cols-3"
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={item}>
                <Link href={feature.link} className="block h-full group">
                  <Card className="h-full relative overflow-hidden border-border/50 bg-white/40 backdrop-blur-md transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/20 dark:bg-slate-900/40 text-center flex flex-col items-center p-5">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative mb-3 flex items-center gap-3 w-full">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-primary/10 shadow-inner">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg font-serif text-foreground/90 group-hover:text-primary transition-colors text-left">
                        {feature.title}
                      </CardTitle>
                      <div className="ml-auto bg-background/80 backdrop-blur-sm border border-secondary text-[10px] font-medium px-2 py-0.5 rounded-full text-foreground/70 shadow-sm">
                        {feature.highlight}
                      </div>
                    </div>

                    <CardDescription className="text-sm leading-relaxed text-muted-foreground/80 text-left w-full pl-[52px]">
                      {feature.description}
                    </CardDescription>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Compact Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="pt-2 border-t border-border/30"
        >
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { title: "总文章", value: "0", sub: "积累" },
              { title: "已发布", value: "0", sub: "影响" },
              { title: "任务", value: "0", sub: "分析" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-default">
                <div className="text-2xl font-bold text-primary font-serif mb-0.5 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground flex gap-1 items-center">
                  {stat.title} <span className="opacity-50">·</span> {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
