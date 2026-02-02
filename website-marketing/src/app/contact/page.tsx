import { Mail, MapPin, Clock, MessageCircle, Headphones } from "lucide-react";
import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact Us - TaskSystem",
  description:
    "Get in touch with TaskSystem. Contact us for sales inquiries, enterprise pricing, support, or partnership opportunities.",
};

export default function ContactPage() {
  const contactInfo = [
    {
      icon: <Mail size={24} />,
      title: "Email",
      content: "contact@taskmanagement.com",
      description: "For general inquiries",
    },
    {
      icon: <MessageCircle size={24} />,
      title: "Sales",
      content: "sales@taskmanagement.com",
      description: "For enterprise pricing",
    },
    {
      icon: <MapPin size={24} />,
      title: "Location",
      content: "Phnom Penh, Cambodia",
      description: "TaskSystem Technologies HQ",
    },
    {
      icon: <Clock size={24} />,
      title: "Support Hours",
      content: "Mon - Fri, 9AM - 6PM",
      description: "Local time (ICT)",
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section
        className="section"
        style={{ paddingTop: "6rem", paddingBottom: "3rem" }}
      >
        <div className="container">
          <div className="section-header" style={{ marginBottom: "3rem" }}>
            <h1 className="heading-xl">
              Get in <span>Touch</span>
            </h1>
            <p className="subtitle" style={{ maxWidth: 600 }}>
              Have questions about TaskSystem? Want to discuss enterprise pricing? Our
              team is here to help.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Grid */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: "3rem",
            }}
          >
            {/* Contact Form */}
            <div>
              <h2 className="heading-md" style={{ marginBottom: "1.5rem" }}>
                Send us a message
              </h2>
              <ContactForm />
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="heading-md" style={{ marginBottom: "1.5rem" }}>
                Contact Information
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {contactInfo.map((info, index) => (
                  <div
                    key={index}
                    className="card hover-lift"
                    style={{ padding: "1.5rem" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "1rem",
                      }}
                    >
                      <div
                        className="icon-wrapper"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          flexShrink: 0,
                        }}
                      >
                        {info.icon}
                      </div>
                      <div>
                        <h4
                          style={{ marginBottom: "0.25rem", fontWeight: 600 }}
                        >
                          {info.title}
                        </h4>
                        <p
                          style={{
                            color: "var(--text-primary)",
                            margin: 0,
                            fontWeight: 500,
                          }}
                        >
                          {info.content}
                        </p>
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.875rem",
                            margin: 0,
                          }}
                        >
                          {info.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Section */}
              <div
                className="card hover-lift"
                style={{
                  marginTop: "1.5rem",
                  padding: "2rem",
                  textAlign: "center",
                  background:
                    "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, var(--bg-secondary) 100%)",
                  borderColor: "rgba(124, 58, 237, 0.2)",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background:
                      "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(124, 58, 237, 0.1) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                    color: "#9f67ff",
                  }}
                >
                  <Headphones size={28} />
                </div>
                <h3 className="heading-sm" style={{ marginBottom: "0.5rem" }}>
                  Looking for Enterprise?
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "1.25rem",
                    fontSize: "0.9375rem",
                    lineHeight: 1.6,
                  }}
                >
                  Get custom pricing for large organizations with dedicated
                  support and advanced features.
                </p>
                <a
                  href="mailto:sales@taskmanagement.com"
                  className="btn btn-enterprise"
                  style={{ display: "inline-flex" }}
                >
                  <Mail size={18} />
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section
        className="section"
        style={{ background: "rgba(18, 18, 26, 0.5)" }}
      >
        <div className="container">
          <div
            style={{
              background:
                "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-secondary) 100%)",
              borderRadius: 24,
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border-color)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                width: 400,
                height: 400,
                borderRadius: "50%",
                border: "1px solid var(--border-color)",
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 250,
                height: 250,
                borderRadius: "50%",
                border: "1px solid var(--border-color)",
                opacity: 0.7,
              }}
            />
            <div
              style={{
                position: "absolute",
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(241, 24, 76, 0.1)",
                border: "1px solid rgba(241, 24, 76, 0.2)",
              }}
            />

            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "var(--gradient-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <MapPin size={24} color="white" />
              </div>
              <p
                style={{
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  marginBottom: "0.25rem",
                }}
              >
                Phnom Penh, Cambodia
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                TaskSystem Technologies Headquarters
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
