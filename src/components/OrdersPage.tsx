'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext'
import { Hash, Phone, Globe, CheckCircle, ArrowRight, FileText } from 'lucide-react'
import DraftOrdersBanner from './DraftOrdersBanner'

export default function OrdersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loadingNumbers, setLoadingNumbers] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)

  const handleNumbersClick = () => {
    setLoadingNumbers(true)
    router.push('/numbers')
  }

  const handleViewOrdersClick = () => {
    setLoadingOrders(true)
    router.push('/orders')
  }

  const userName = (user?.user_metadata as { name?: string })?.name || user?.email

  return (
    <main className="bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Draft Orders Banner */}
        <DraftOrdersBanner />

        {/* Hero Section */}
        <section className="pt-12 pb-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-[#215F9A] mb-4">
              Welcome to Voxco
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-2">
              Your Global Number Ordering Platform
            </p>
            <p className="text-lg text-gray-600 mb-8">
              Welcome back, <span className="font-semibold text-[#215F9A]">{userName}</span>
            </p>

            {/* CTA Buttons - moved above Streamline section */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleNumbersClick}
                disabled={loadingNumbers}
                className="inline-flex items-center justify-center gap-3 bg-[#215F9A] text-white px-8 py-4 rounded-lg hover:bg-[#2c78c0] transition-all text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loadingNumbers ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <Hash className="w-5 h-5" />
                    Search & Order Numbers
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                onClick={handleViewOrdersClick}
                disabled={loadingOrders}
                className="inline-flex items-center justify-center gap-3 bg-white border-2 border-[#215F9A] text-[#215F9A] px-8 py-4 rounded-lg hover:bg-[#215F9A] hover:text-white transition-all text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loadingOrders ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    View My Orders
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Hero Description */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-12">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                Streamline Your Number Ordering Process
              </h2>
              <p className="text-lg text-gray-700 mb-8 text-center leading-relaxed">
                Voxco provides a comprehensive platform for ordering phone numbers across multiple countries.
                Search, select, and order numbers with ease. Track your orders in real-time and manage your
                requirements all in one place.
              </p>

              {/* Features Grid */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl">
                  <div className="bg-[#215F9A] p-3 rounded-full mb-4">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Global Coverage</h3>
                  <p className="text-gray-600 text-sm">
                    Access phone numbers from multiple countries worldwide
                  </p>
                </div>

                <div className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl">
                  <div className="bg-[#215F9A] p-3 rounded-full mb-4">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Easy Ordering</h3>
                  <p className="text-gray-600 text-sm">
                    Simple search and order process with real-time tracking
                  </p>
                </div>

                <div className="flex flex-col items-center text-center p-6 bg-blue-50 rounded-xl">
                  <div className="bg-[#215F9A] p-3 rounded-full mb-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Fast Processing</h3>
                  <p className="text-gray-600 text-sm">
                    Quick approval and provisioning of your number orders
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats or Additional Info */}
          <div className="bg-gradient-to-r from-[#215F9A] to-[#2c78c0] rounded-2xl shadow-xl p-8 text-white">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-2xl font-bold mb-4">Get Started in Minutes</h3>
              <p className="text-blue-100 mb-6">
                Browse our extensive catalog of phone numbers, select your preferred country and number type,
                upload required documents, and place your order. Our team will review and process your request promptly.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>No setup fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>24/7 Support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Fast Approval</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

