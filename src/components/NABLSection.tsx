import { Award, Shield, CheckCircle, Clock } from "lucide-react";

const NABLSection = () => {
  const features = [
    {
      icon: Award,
      title: "50K+",
      subtitle: "Patients Served",
      description: "Trust us with their health"
    },
    {
      icon: Shield,
      title: "99.2%", 
      subtitle: "Accuracy Rate",
      description: "Industry-leading precision"
    },
    {
      icon: Clock,
      title: "< 24h",
      subtitle: "Average Results", 
      description: "Faster than industry standard"
    },
    {
      icon: CheckCircle,
      title: "ISO 15189",
      subtitle: "Certified Lab",
      description: "International quality standards"
    }
  ];

  return (
    <section className="py-20 bg-white/10 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        {/* Main Title */}
        <div className="text-center mb-8 sm:mb-12 lg:mb-16 px-4 sm:px-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 leading-tight">
            Processed at only
          </h2>
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 lg:mb-8 text-black">
            NABL Accredited Lab
          </div>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-medium text-black max-w-3xl mx-auto">
            Processing at partnered labs with advanced medical laboratory services with certified quality standards and faster results than industry standard
          </p>
        </div>

        {/* Features Grid - No Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 max-w-6xl mx-auto px-4 sm:px-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="text-center">
                {/* Icon with gradient background */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-r from-purple-100 to-orange-100 flex items-center justify-center">
                  <IconComponent 
                    className="w-6 h-6 sm:w-8 sm:h-8" 
                    style={{ 
                      color: 'transparent',
                      background: 'var(--accent-gradient)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text'
                    }}
                  />
                </div>
                
                {/* Title with gradient */}
                <h3 
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent"
                  style={{
                    backgroundImage: 'var(--accent-gradient)'
                  }}
                >
                  {feature.title}
                </h3>
                
                {/* Subtitle in white */}
                <h4 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  {feature.subtitle}
                </h4>
                
                {/* Description with gradient */}
                <p 
                  className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent font-medium"
                  style={{
                    backgroundImage: 'var(--accent-gradient)'
                  }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NABLSection;