"use client"

import { motion } from "framer-motion"

export function AnimatedLock() {
    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500"
            >
                <motion.path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    variants={{
                        hidden: { y: -5 },
                        visible: { y: 0 },
                        exit: { y: -5 }
                    }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
                />
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            </svg>
        </div>
    )
}
