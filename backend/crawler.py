import random
from datetime import datetime, timedelta
from scorer import extract_skills

COMPANIES = [
    "Stripe", "Datadog", "Snowflake", "Confluent", "HashiCorp",
    "Databricks", "Scale AI", "Vercel", "PlanetScale", "Temporal",
    "Grafana Labs", "Supabase", "Modal", "Replicate", "Neon",
    "Upstash", "Turso", "Render", "Fly.io", "Railway",
    "Cloudflare", "Linear", "Notion", "Figma", "Retool",
]

LOCATIONS = [
    "Austin, TX", "Remote", "New York, NY",
    "San Francisco, CA", "Seattle, WA",
]

SALARY_RANGES = {
    "swe": ["$120k–$160k", "$140k–$180k", "$160k–$210k", "$130k–$170k"],
    "de": ["$130k–$170k", "$150k–$190k", "$145k–$185k", "$125k–$165k"],
    "ml": ["$150k–$200k", "$170k–$220k", "$160k–$210k", "$140k–$190k"],
    "infra": ["$130k–$170k", "$145k–$185k", "$155k–$195k", "$120k–$160k"],
    "ds": ["$120k–$160k", "$135k–$175k", "$145k–$185k", "$115k–$155k"],
}


def _posted_at() -> datetime:
    return datetime.utcnow() - timedelta(days=random.randint(0, 30))


def _company() -> str:
    return random.choice(COMPANIES)


def _location() -> str:
    return random.choices(
        LOCATIONS, weights=[20, 35, 15, 20, 10], k=1
    )[0]


SWE_BACKEND_JOBS = [
    {
        "title": "Senior Backend Engineer",
        "description": (
            "We are looking for a Senior Backend Engineer to design and scale our core platform APIs. "
            "You will work with Python, FastAPI, and PostgreSQL to build high-throughput services "
            "handling millions of requests per day. Experience with Redis caching, Docker, and "
            "Kubernetes for container orchestration is essential. You will also contribute to our "
            "Kafka-based event streaming infrastructure and AWS cloud deployments."
        ),
    },
    {
        "title": "Backend Engineer (Platform)",
        "description": (
            "Join our platform team to build the infrastructure powering our developer tools. "
            "You will write Go and Python microservices deployed on Kubernetes with Helm charts. "
            "Strong knowledge of PostgreSQL query optimization, Redis data structures, and Docker "
            "containerization is required. We use AWS extensively across EC2, RDS, and EKS. "
            "Experience with GraphQL API design is a strong plus."
        ),
    },
    {
        "title": "Software Engineer – API Infrastructure",
        "description": (
            "Build the API layer that millions of developers depend on every day. "
            "This role requires deep experience with Python or Node.js for building REST and GraphQL APIs. "
            "You will manage PostgreSQL databases, implement Redis-based rate limiting and caching, "
            "and deploy services using Docker and Kubernetes. AWS cloud experience (ECS, Lambda, RDS) "
            "is required along with 3+ years of backend development."
        ),
    },
    {
        "title": "Backend Engineer – Payments",
        "description": (
            "Own the payment processing infrastructure at our fintech platform. "
            "We need an engineer with Java or Python experience building reliable, secure backend systems. "
            "You will work with PostgreSQL for transactional data, Redis for session management, "
            "and Kafka for payment event streaming. Docker and Kubernetes skills are required for "
            "our AWS-based deployment pipeline. 4+ years of experience expected."
        ),
    },
    {
        "title": "Senior Software Engineer – Distributed Systems",
        "description": (
            "Design and implement distributed systems that underpin our real-time data platform. "
            "You will use Go and Python to build services that process Kafka event streams at scale. "
            "PostgreSQL and Redis are core data stores in our stack, deployed via Docker on Kubernetes. "
            "AWS expertise including EC2, SQS, and S3 is needed. We're looking for 5+ years of "
            "experience with distributed systems design."
        ),
    },
]

SWE_FULLSTACK_JOBS = [
    {
        "title": "Full-Stack Engineer",
        "description": (
            "Build end-to-end product features spanning our React frontend and Python/FastAPI backend. "
            "You will design TypeScript components, REST APIs, and PostgreSQL schemas together. "
            "Experience with Redis for session storage, Docker for local development, and AWS deployments "
            "is required. We value engineers who can ship entire features independently. "
            "3+ years of full-stack experience required."
        ),
    },
    {
        "title": "Full-Stack Software Engineer – Growth",
        "description": (
            "Own growth experiments from data model through UI at our B2B SaaS platform. "
            "You will write React and TypeScript frontends backed by Node.js APIs and PostgreSQL. "
            "Redis is used for caching and queuing, Docker for reproducible environments. "
            "AWS infrastructure knowledge (CloudFront, RDS, ECS) helps you ship faster. "
            "GraphQL API design experience is a bonus."
        ),
    },
    {
        "title": "Software Engineer – Product (Full-Stack)",
        "description": (
            "Ship high-quality user-facing features as part of our core product team. "
            "This role requires strong React and TypeScript skills on the frontend paired with "
            "Python or Node.js on the backend. We use PostgreSQL as our primary database, "
            "Redis for caching, and Kubernetes on AWS for deployments. "
            "You should be comfortable reviewing Docker configurations and writing SQL queries. "
            "2+ years of full-stack experience."
        ),
    },
    {
        "title": "Senior Full-Stack Engineer – Developer Experience",
        "description": (
            "Improve the tools and workflows our 200-person engineering team relies on daily. "
            "You'll build React dashboards, TypeScript CLI tooling, and FastAPI backend services. "
            "PostgreSQL and Redis are core to our internal platform, all running on Kubernetes in AWS. "
            "GraphQL is used for our internal API gateway. "
            "We need someone with 4+ years across the stack who cares deeply about developer productivity."
        ),
    },
    {
        "title": "Full-Stack Engineer – Marketplace",
        "description": (
            "Build the marketplace features connecting buyers and sellers on our platform. "
            "Strong React with TypeScript skills are required alongside Node.js or Python backend expertise. "
            "You will work with PostgreSQL for listings data, Redis for real-time inventory caching, "
            "and Kafka for order events. Docker and AWS experience rounds out the role. "
            "We are a small team so you'll own features end-to-end."
        ),
    },
]

DE_JOBS = [
    {
        "title": "Senior Data Engineer",
        "description": (
            "Build and maintain the data infrastructure that powers our analytics platform. "
            "You will design Apache Airflow DAGs to orchestrate dbt transformations on Snowflake. "
            "Experience with Apache Spark for large-scale batch processing, Kafka for streaming ingestion, "
            "and AWS services (S3, Glue, Redshift) is required. "
            "Python scripting and Terraform for infrastructure-as-code are core to the role. "
            "4+ years of data engineering experience expected."
        ),
    },
    {
        "title": "Data Engineer – Analytics Platform",
        "description": (
            "Scale the data pipelines that feed our machine learning and BI teams. "
            "This role requires deep experience with dbt for transformations and BigQuery as a warehouse. "
            "You will build Apache Airflow pipelines, process Kafka streams, and write Python ETL scripts. "
            "PostgreSQL expertise is needed for operational data stores, "
            "and Great Expectations for data quality validation. Terraform manages our AWS infrastructure."
        ),
    },
    {
        "title": "Data Engineer – Streaming",
        "description": (
            "Own our real-time data streaming infrastructure processing 10B events per day. "
            "Deep expertise in Kafka, Apache Spark Structured Streaming, and Python is required. "
            "You will write dbt models against Snowflake for downstream analytics, "
            "manage Airflow DAG schedules, and use Iceberg table format for our data lake on AWS. "
            "Terraform is used for all infrastructure. 3+ years in streaming data engineering."
        ),
    },
    {
        "title": "Senior Data Engineer – Lakehouse",
        "description": (
            "Design our next-generation lakehouse architecture on AWS using Apache Iceberg and Trino. "
            "You will build Apache Spark jobs in Python, orchestrate them with Apache Airflow, "
            "and create dbt models for the analytics layer. Snowflake handles our data warehouse workloads. "
            "Great Expectations validates data quality at ingestion. "
            "Terraform provisions all infrastructure. 5+ years of experience needed."
        ),
    },
    {
        "title": "Data Engineer – BI & Reporting",
        "description": (
            "Power our business intelligence platform with reliable, well-documented data pipelines. "
            "You will model data in dbt against our BigQuery warehouse, orchestrate jobs in Apache Airflow, "
            "and write Python utilities for data validation using Great Expectations. "
            "Kafka feeds real-time data into our streaming layer on AWS. "
            "PostgreSQL is used for operational reporting. Experience with Trino for federated queries is a plus."
        ),
    },
    {
        "title": "Staff Data Engineer",
        "description": (
            "Lead the architecture of our enterprise data platform serving 50+ internal teams. "
            "You will set standards for dbt project structure, Apache Airflow best practices, "
            "and Snowflake data modeling. Apache Spark on AWS EMR handles petabyte-scale batch processing. "
            "Kafka powers our event streaming backbone. Terraform and Python are daily tools. "
            "We also evaluate Iceberg and Trino for federated query capabilities. 6+ years required."
        ),
    },
    {
        "title": "Data Engineer – Platform Reliability",
        "description": (
            "Ensure the reliability and observability of our entire data platform. "
            "You will build monitoring for Apache Airflow pipelines, Kafka consumer lag, "
            "and dbt model freshness against Snowflake. Python is used for alerting and automation. "
            "Great Expectations enforces data contracts at each layer. "
            "AWS CloudWatch and Terraform complete the infrastructure picture. 3+ years of experience."
        ),
    },
    {
        "title": "Data Engineer – ML Infra",
        "description": (
            "Build the data foundation for our ML platform. "
            "You will engineer feature pipelines in Python using Apache Spark and Apache Airflow, "
            "storing outputs in Snowflake and BigQuery. dbt models provide clean feature tables, "
            "validated by Great Expectations. Kafka streams real-time signals for online inference. "
            "AWS infrastructure is managed with Terraform. Familiarity with Iceberg for feature stores is a plus."
        ),
    },
    {
        "title": "Analytics Engineer",
        "description": (
            "Bridge the gap between raw data and business insights as our Analytics Engineer. "
            "You will own our dbt project, writing SQL models against BigQuery and PostgreSQL. "
            "Apache Airflow orchestrates dbt runs and EL pipeline jobs written in Python. "
            "Great Expectations data tests are a first-class deliverable. "
            "Trino enables cross-source querying across our data lake on AWS. 2+ years of dbt experience."
        ),
    },
    {
        "title": "Data Engineer – Fintech",
        "description": (
            "Build compliant, auditable data pipelines for our financial services platform. "
            "You will design Apache Airflow workflows that load and transform data in Snowflake using dbt. "
            "Python is the primary language for ETL logic and Apache Spark for large dataset processing. "
            "Kafka captures real-time transaction events, PostgreSQL stores operational records, "
            "and Terraform manages AWS infrastructure. Great Expectations enforces data quality SLAs."
        ),
    },
]

ML_JOBS = [
    {
        "title": "Machine Learning Engineer",
        "description": (
            "Build and deploy production ML systems that power our recommendation engine. "
            "You will train models using PyTorch and scikit-learn, track experiments with MLflow, "
            "and deploy to AWS SageMaker. Experience with Hugging Face transformers, spaCy for NLP, "
            "and FAISS for vector similarity search is required. "
            "Docker containerization and Python are core to the workflow. 3+ years of ML engineering experience."
        ),
    },
    {
        "title": "Senior ML Engineer – LLM Applications",
        "description": (
            "Build LLM-powered product features using LangChain, RAG pipelines, and vector databases. "
            "You will fine-tune models with Hugging Face and evaluate them using RAGAS metrics. "
            "FAISS and pgvector are used for embedding search, backed by Python services on Docker. "
            "MLflow tracks all experiment runs and model versions. AWS SageMaker handles training at scale. "
            "PyTorch is the primary training framework. 4+ years in applied ML required."
        ),
    },
    {
        "title": "ML Engineer – Computer Vision",
        "description": (
            "Train and deploy computer vision models for our document understanding product. "
            "Deep expertise in PyTorch and TensorFlow is required along with scikit-learn for classical models. "
            "You will use AWS SageMaker for distributed training, MLflow for experiment tracking, "
            "and Docker for reproducible model environments. "
            "FAISS powers our similarity search for document retrieval. Python and SQL are daily tools. "
            "5+ years of ML experience expected."
        ),
    },
    {
        "title": "ML Platform Engineer",
        "description": (
            "Build the ML platform infrastructure that 30+ data scientists depend on daily. "
            "You will maintain our MLflow tracking server, AWS SageMaker pipelines, and feature store. "
            "Python is used to build SDK tooling, Docker for model packaging, and SQL for data access. "
            "Experience with PyTorch and scikit-learn helps you understand user needs. "
            "LangChain and Hugging Face are increasingly part of our stack as we adopt LLMs."
        ),
    },
    {
        "title": "NLP Engineer",
        "description": (
            "Build NLP pipelines that extract structured information from unstructured text at scale. "
            "You will use spaCy for entity extraction, Hugging Face for transformer models, "
            "and LangChain for composing RAG workflows. PyTorch is used for fine-tuning, "
            "MLflow tracks experiments, and FAISS indexes embeddings for retrieval. "
            "AWS SageMaker deploys models to production. Docker and Python complete the stack. "
            "3+ years of NLP engineering required."
        ),
    },
    {
        "title": "Senior ML Engineer – Recommendations",
        "description": (
            "Own the recommendation engine serving 10M+ users at our e-commerce platform. "
            "You will build two-tower models in PyTorch, train with TensorFlow for legacy compatibility, "
            "and track all runs in MLflow. FAISS powers our ANN retrieval layer, "
            "with AWS SageMaker for production inference. Python glues everything together. "
            "scikit-learn handles feature preprocessing. SQL queries power offline evaluation. "
            "5+ years of recommendation systems experience."
        ),
    },
    {
        "title": "Research Engineer – Generative AI",
        "description": (
            "Prototype and productionize generative AI features using the latest foundation models. "
            "You will use LangChain to build agentic workflows, RAG pipelines for knowledge grounding, "
            "and Hugging Face for model access and fine-tuning. PyTorch is used for custom training. "
            "MLflow tracks experiments, FAISS indexes vector embeddings, and Docker packages services. "
            "AWS SageMaker and spaCy round out the stack. 3+ years in ML with LLM experience required."
        ),
    },
    {
        "title": "ML Engineer – Fraud Detection",
        "description": (
            "Build real-time fraud detection models that process millions of transactions daily. "
            "You will use scikit-learn and PyTorch for model development, MLflow for experiment tracking, "
            "and AWS SageMaker for low-latency inference endpoints. "
            "Python and SQL are core for feature engineering and data analysis. "
            "Docker packages all services and FAISS enables fast similarity lookups. "
            "Experience with streaming data and Kafka is a strong plus. 4+ years required."
        ),
    },
    {
        "title": "Applied Scientist",
        "description": (
            "Apply cutting-edge ML research to improve our core product metrics. "
            "You will train large models using PyTorch and TensorFlow, leveraging Hugging Face "
            "for pretrained checkpoints. MLflow manages the experiment lifecycle on AWS SageMaker. "
            "spaCy handles text preprocessing, FAISS powers embedding retrieval, "
            "and LangChain structures our RAG evaluation harness. Python and SQL are daily tools. "
            "PhD or 4+ years of applied research experience."
        ),
    },
    {
        "title": "ML Engineer – Feature Store",
        "description": (
            "Build and maintain the feature store infrastructure for our ML platform. "
            "You will write Python feature pipelines, integrate with scikit-learn and PyTorch workflows, "
            "and expose features via SQL-based APIs backed by our data warehouse. "
            "MLflow tracks feature versions and model associations. AWS SageMaker is our serving layer. "
            "Docker packages feature computation jobs. FAISS enables embedding feature lookups. "
            "3+ years of ML infrastructure experience required."
        ),
    },
]

INFRA_JOBS = [
    {
        "title": "Senior DevOps Engineer",
        "description": (
            "Own the CI/CD and infrastructure automation for our cloud-native platform. "
            "You will write Terraform modules for AWS and GCP, manage Kubernetes clusters with Helm charts, "
            "and build GitHub Actions pipelines. Prometheus and Grafana provide observability, "
            "ArgoCD handles GitOps deployments, and Ansible automates configuration management. "
            "Docker expertise is essential, Linux administration skills required. 4+ years in DevOps."
        ),
    },
    {
        "title": "Infrastructure Engineer",
        "description": (
            "Design and maintain the cloud infrastructure powering our global SaaS platform. "
            "Deep Terraform experience across AWS and GCP is required to manage VPCs, EKS, and GKE clusters. "
            "You will implement Helm-based application packaging, set up Prometheus metrics collection, "
            "build Grafana dashboards, and automate deployments with ArgoCD. "
            "Linux, Docker, and Kubernetes are core daily tools. GitHub Actions powers our pipelines."
        ),
    },
    {
        "title": "Platform Engineer – Kubernetes",
        "description": (
            "Build and operate our multi-tenant Kubernetes platform used by 100+ engineering teams. "
            "Expert-level Kubernetes knowledge is required along with Helm for application packaging. "
            "You will write Terraform for AWS infrastructure, implement Prometheus-based alerting, "
            "and build Grafana dashboards for platform SLOs. ArgoCD manages all workload deployments. "
            "Docker, Linux, and GitHub Actions are daily tools. 5+ years of Kubernetes experience."
        ),
    },
    {
        "title": "Site Reliability Engineer",
        "description": (
            "Ensure the reliability of our platform serving 99.99% SLA commitments. "
            "You will build Prometheus alerting rules, Grafana runbook dashboards, and automated remediation. "
            "Kubernetes and Helm manage our workloads on AWS EKS, provisioned via Terraform. "
            "ArgoCD handles continuous delivery, Jenkins runs legacy CI pipelines, "
            "and Ansible automates operational tasks. Docker and Linux are foundational skills. "
            "3+ years of SRE experience required."
        ),
    },
    {
        "title": "Cloud Infrastructure Engineer",
        "description": (
            "Architect scalable, cost-efficient cloud infrastructure on AWS and GCP. "
            "This role requires extensive Terraform experience, Kubernetes administration, "
            "and Helm chart development. You will implement infrastructure observability with Prometheus "
            "and Grafana, deploy applications via ArgoCD GitOps workflows, and automate with Ansible. "
            "GitHub Actions powers our self-service CI/CD platform. Linux and Docker are prerequisites. "
            "4+ years cloud infrastructure experience needed."
        ),
    },
    {
        "title": "DevOps Engineer – Security",
        "description": (
            "Embed security best practices into our DevOps workflows and infrastructure. "
            "You will harden Kubernetes workloads, write Terraform security modules for AWS and GCP, "
            "and integrate scanning into GitHub Actions pipelines. Helm charts follow CIS benchmarks. "
            "Prometheus monitors security metrics, Grafana visualizes compliance dashboards. "
            "Ansible enforces configuration baselines across Linux hosts. Docker image scanning is core. "
            "3+ years of DevSecOps experience."
        ),
    },
    {
        "title": "Staff Infrastructure Engineer",
        "description": (
            "Define infrastructure strategy and set standards across our 500-engineer organization. "
            "You will architect our AWS and GCP multi-cloud strategy using Terraform, "
            "lead Kubernetes platform evolution with Helm and ArgoCD, and build the observability platform "
            "with Prometheus and Grafana. Jenkins to GitHub Actions migration is a near-term initiative. "
            "Ansible manages thousands of Linux hosts. Docker is ubiquitous. 7+ years of experience needed."
        ),
    },
    {
        "title": "Platform Engineer – Observability",
        "description": (
            "Build world-class observability for our microservices architecture. "
            "You will own our Prometheus federation setup, Grafana dashboards and alerting, "
            "and distributed tracing infrastructure. Kubernetes on AWS EKS is the deployment platform, "
            "managed via Terraform and Helm. ArgoCD handles GitOps. GitHub Actions builds and pushes "
            "Docker images. Linux performance analysis and profiling skills are required. 4+ years experience."
        ),
    },
    {
        "title": "Infrastructure Engineer – Data Platform",
        "description": (
            "Run the infrastructure powering our data engineering workloads at scale. "
            "You will provision Kubernetes clusters on AWS and GCP with Terraform, "
            "deploy Airflow and Spark using Helm charts, and monitor with Prometheus and Grafana. "
            "ArgoCD automates deployments, GitHub Actions drives CI, and Ansible manages host configuration. "
            "Linux and Docker are foundational requirements. 3+ years of data infrastructure experience."
        ),
    },
    {
        "title": "DevOps Engineer – CI/CD Platform",
        "description": (
            "Build and maintain the CI/CD platform trusted by 300 engineers to ship code safely. "
            "You will design GitHub Actions workflows, manage Jenkins agents on Linux hosts, "
            "and build Docker image pipelines. Kubernetes on AWS EKS runs our build infrastructure, "
            "provisioned via Terraform with Helm charts. ArgoCD enables progressive delivery. "
            "Prometheus and Grafana provide pipeline observability. Ansible handles agent configuration. "
            "3+ years of CI/CD platform engineering required."
        ),
    },
]

DS_JOBS = [
    {
        "title": "Data Scientist",
        "description": (
            "Drive product decisions through rigorous experimentation and predictive modeling. "
            "You will design A/B tests, build scikit-learn and PyTorch models, and analyze results with "
            "Python, pandas, and SQL. Tableau and Power BI dashboards communicate insights to stakeholders. "
            "AWS is our cloud provider; Jupyter notebooks are standard for exploratory analysis. "
            "R is used for statistical analysis. 3+ years of data science experience required."
        ),
    },
    {
        "title": "Senior Data Scientist – Product",
        "description": (
            "Own the measurement and optimization of our core product metrics. "
            "You will run A/B tests end-to-end, build predictive models with scikit-learn and PyTorch, "
            "and present findings with Tableau. Python and pandas are primary tools for data manipulation, "
            "SQL queries extract data from our AWS Redshift warehouse, "
            "and R handles advanced statistical modeling. Jupyter notebooks document all analyses. "
            "4+ years of product data science experience."
        ),
    },
    {
        "title": "Data Scientist – ML",
        "description": (
            "Apply machine learning to solve complex business problems across our platform. "
            "You will use Python, scikit-learn, and PyTorch for model development, "
            "pandas for feature engineering, and SQL for data extraction from our warehouse. "
            "Statistical rigor is core—experience with A/B Testing, hypothesis testing, and Statistics "
            "is required. AWS SageMaker deploys models; Jupyter notebooks drive exploration. "
            "Tableau visualizes model outputs for business stakeholders."
        ),
    },
    {
        "title": "Data Scientist – Growth",
        "description": (
            "Use data to unlock growth levers across acquisition, activation, and retention. "
            "You will design and analyze A/B tests, build causal inference models in Python and R, "
            "and use pandas for cohort analysis. SQL drives all data extraction from our AWS data warehouse. "
            "scikit-learn handles propensity modeling, Jupyter notebooks are your workspace, "
            "and Power BI dashboards make insights self-serve. 2+ years of growth analytics experience."
        ),
    },
    {
        "title": "Senior Data Scientist – Pricing",
        "description": (
            "Build pricing models that maximize revenue across our marketplace. "
            "Deep Statistics knowledge and A/B Testing experience are required alongside Python and R. "
            "You will use pandas and scikit-learn for model development, PyTorch for deep learning experiments, "
            "and SQL to query our AWS data warehouse. Tableau communicates pricing strategy to leadership. "
            "Jupyter notebooks document methodology. Power BI enables business users to explore results. "
            "4+ years of quantitative pricing or data science experience."
        ),
    },
    {
        "title": "Staff Data Scientist",
        "description": (
            "Lead our data science practice and mentor a team of 8 scientists. "
            "You will set standards for experimentation (A/B Testing frameworks in Python and R), "
            "model development (scikit-learn, PyTorch), and data analysis (pandas, SQL on AWS). "
            "Tableau and Power BI governance falls under your purview. "
            "Jupyter environments are standardized across the team. "
            "You will present statistical analysis and recommendations to the C-suite. 7+ years required."
        ),
    },
    {
        "title": "Data Scientist – Operations Research",
        "description": (
            "Apply optimization and simulation to improve operational efficiency. "
            "You will build optimization models in Python using scipy and scikit-learn, "
            "validate with Statistics and A/B Testing, and analyze results with pandas and SQL in AWS. "
            "R is used for advanced econometric modeling. Jupyter notebooks are standard. "
            "Tableau dashboards track operational KPIs. PyTorch is used for neural network experiments. "
            "3+ years of operations research or data science experience."
        ),
    },
    {
        "title": "Data Scientist – Customer Analytics",
        "description": (
            "Understand customer behavior deeply and build models that improve lifetime value. "
            "You will build churn prediction models using scikit-learn and PyTorch in Python, "
            "run A/B tests to validate interventions, and use pandas and SQL to analyze cohorts on AWS. "
            "R handles survival analysis and statistical modeling. Tableau and Power BI serve as "
            "self-service analytics platforms for the customer success team. Jupyter notebooks are standard. "
            "3+ years of customer analytics or data science experience."
        ),
    },
    {
        "title": "Data Scientist – NLP",
        "description": (
            "Build NLP models to extract insights from millions of customer interactions daily. "
            "You will use Python, PyTorch, and scikit-learn for model development, "
            "pandas for text feature engineering, and SQL for data access on AWS. "
            "Statistical evaluation and A/B Testing validate model improvements. "
            "Jupyter notebooks are the primary development environment. "
            "Tableau communicates NLP model outputs to non-technical stakeholders. "
            "R is used for statistical significance testing. 3+ years NLP experience."
        ),
    },
    {
        "title": "Decision Scientist",
        "description": (
            "Build the decision systems that personalize experiences for 50M+ users. "
            "You will design multi-armed bandit experiments alongside traditional A/B Testing, "
            "build contextual bandit models in Python using scikit-learn and PyTorch, "
            "and analyze performance with pandas and SQL on AWS. "
            "R handles Bayesian statistical analysis. Jupyter notebooks document all experiments. "
            "Tableau and Power BI make results accessible company-wide. "
            "Statistics expertise and 4+ years of decision science experience required."
        ),
    },
]


def generate_mock_jobs() -> list[dict]:
    all_jobs = []
    role_groups = [
        (SWE_BACKEND_JOBS, "swe"),
        (SWE_FULLSTACK_JOBS, "swe"),
        (DE_JOBS, "de"),
        (ML_JOBS, "ml"),
        (INFRA_JOBS, "infra"),
        (DS_JOBS, "ds"),
    ]

    used_companies = set()

    for job_templates, role_key in role_groups:
        for template in job_templates:
            company = _company()
            attempts = 0
            while company in used_companies and attempts < 10:
                company = _company()
                attempts += 1
            used_companies.add(company)
            if len(used_companies) > len(COMPANIES) * 2:
                used_companies.clear()

            description = template["description"]
            skills = extract_skills(description)

            all_jobs.append({
                "title": template["title"],
                "company": company,
                "location": _location(),
                "salary_range": random.choice(SALARY_RANGES[role_key]),
                "job_description": description,
                "required_skills": skills,
                "posted_at": _posted_at(),
            })

    return all_jobs
