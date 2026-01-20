import { Calendar, Home, FileCheck } from 'lucide-react';

const HowItWorksSection = () => {
  const steps = [
    {
      icon: Calendar,
      title: 'Book Online',
      description: 'Select your preferred date and time slot for sample collection',
    },
    {
      icon: Home,
      title: 'Home Sample Collection',
      description: 'Our trained phlebotomist visits your location with all safety measures',
    },
    {
      icon: FileCheck,
      title: 'Get Reports Online',
      description: 'Receive NABL-verified reports digitally in a doctor-friendly format',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
                  <step.icon className="w-8 h-8" />
                </div>
                <div className="text-sm font-semibold text-blue-600 mb-2">Step {index + 1}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
