import { BarChart3, Brain, FileText, Shield, Upload } from "lucide-react";
import Globe3D from "./Globe3D";

const MedicalAISection = () => {
  const insights = [
    {
      icon: BarChart3,
      title: "Data Analysis",
      description: "Advanced analysis of your lab results and health parameters"
    },
    {
      icon: Brain,
      title: "AI Insights", 
      description: "Complex medical terms explained in easy words"
    },
    {
      icon: FileText,
      title: "Clinical Assessment",
      description: "Clinical assessment after your medical data analysis gives a more holistic report"
    },
    {
      icon: Shield,
      title: "Private & Secure",
      description: "Your data is processed securely and privately"
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* PredLabs Logo - Top Right */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black font-work-sans">
          PredLabs
        </h1>
      </div>
      
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[60vh] lg:min-h-[80vh]">
          {/* Left Content */}
          <div className="space-y-6 lg:space-y-8 order-2 lg:order-1">
            {/* Platform Label */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-800"></div>
                <div className="w-3 h-3 bg-gray-800"></div>
                <div className="w-1 h-3 bg-gray-800"></div>
                <div className="w-1 h-3 bg-gray-800"></div>
              </div>
              <div className="text-sm font-mono text-gray-800 tracking-wider font-semibold">
                OUR PLATFORM
              </div>
            </div>

            {/* Main Heading */}
            <div className="space-y-3 sm:space-y-4 lg:space-y-6 text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight px-4 lg:px-0">
                <span className="text-gray-800">Get Simple Insights from</span>
                <br />
                <span className="bg-gradient-to-r from-orange-500 via-orange-400 to-purple-600 bg-clip-text text-transparent">
                  Your Reports
                </span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed max-w-2xl px-4 lg:px-0 mx-auto lg:mx-0">
                Upload your lab reports and get easy-to-understand insights, 
                recommendations, and guidance powered by advanced medical AI in seconds.
              </p>
              
              {/* Upload Link */}
              <div className="flex justify-center lg:justify-start px-4 lg:px-0 mt-8">
                <a
                  href="https://predlabsmedicalanalysis.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-4 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-orange-500 group-hover:text-purple-600 transition-colors duration-300" />
                  <span className="font-bold text-2xl bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                    Upload your report
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Side - 3D Globe */}
          <div className="relative flex items-center justify-center order-1 lg:order-2">
            <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[600px]">
              <Globe3D />
              
              {/* Additional floating dots for extra effect */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-10 w-2 h-2 bg-gray-600 animate-pulse"></div>
                <div className="absolute top-40 right-20 w-2 h-2 bg-gray-600 animate-pulse delay-300"></div>
                <div className="absolute bottom-32 left-32 w-2 h-2 bg-gray-600 animate-pulse delay-700"></div>
                <div className="absolute bottom-20 right-10 w-2 h-2 bg-gray-600 animate-pulse delay-500"></div>
                <div className="absolute top-60 left-60 w-2 h-2 bg-gray-600 animate-pulse delay-1000"></div>
                <div className="absolute top-80 right-40 w-2 h-2 bg-gray-600 animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Row at Bottom */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 px-4 lg:px-0">
          {insights.map((insight, index) => (
            <div 
              key={index}
              className="group flex flex-col items-center gap-3 hover:-translate-y-1 transition-all duration-300 transform hover:scale-105 text-center p-4"
            >
              <div className="p-3 rounded-full bg-gradient-to-br from-orange-100 to-purple-100 group-hover:from-orange-200 group-hover:to-purple-200 transition-all duration-300">
                <insight.icon className="h-6 w-6 text-gray-800" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-gray-700 transition-colors text-lg">
                  {insight.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {insight.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MedicalAISection;