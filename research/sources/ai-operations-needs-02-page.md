Source: https://arxiv.org/pdf/2603.29888v1
Title: 
Fetched: 2026-09-14T03:55:48.402Z

# Generative AI in Action: Field Experimental Evidence from Alibaba’s Customer Service Operations

Xiao Ni a* , Yiwei Wang b* , Tianjun Feng c , Lauren Xiaoyuan Lu d , Yitong Wang e , and Congyi Zhou e

a Fudan University, School of Management, Shanghai, China, xni20@fudan.edu.cn b Zhejiang University, International Business School, Zhejiang, China, yiweiwang@intl.zju.edu.cn c Fudan University, School of Management, Shanghai, China, tfeng@fudan.edu.cn d Dartmouth College, Tuck School of Business, Hanover, NH 03755, lauren.x.lu@tuck.dartmouth.edu e Alibaba Group Inc. * The first two authors contributed equally to this project.

November 2025

**Abstract**

In collaboration with Alibaba, this study leverages a large-scale field experiment to assess the impact of a generative AI assistant on worker performance in e-commerce after-sales service. Human agents providing digital chat support were randomly assigned with access to a gen AI assistant that offered two core functions: diagnosis of customer issues and solution proposals, presented as text messages. Agents retained discretion to adopt, modify, or disregard AI-generated messages. To evaluate gen AI’s impact, we estimate both the intention-to-treat (ITT) effect of gen AI access and the local average treatment effect (LATE) of gen AI usage. Results show that gen AI significantly improved service speed, measured by issue identification time and chat duration. Gen AI also improved subjective service quality reflected in customer ratings and dissatisfaction rates, but it had no significant effect on objective service quality indicated by customer retrial rates. The performance improvements stemmed not only from automation but also from changes in the dynamics of agent-customer interactions: agent communication became more informative and efficient, while customers experienced reduced communication burdens. Low performers achieved the greatest improvements in both service speed and quality, narrowing the performance gap. In contrast, top-performing agents showed little improvement in service speed but experienced declines in both subjective and objective service quality. Evidence suggests that this decline results from increased multitasking tendency, proxied by longer shift-away times across concurrent chats, which slowed customer responses and raised abandonment and retrial rates. These findings suggest that gen AI reshapes work, demanding tailored deployment strategies.

## Keywords: generative AI, human-AI interaction, customer service operations, automation, e-commerce

---

## 1 Introduction

The rapid advancement of artificial intelligence (AI) is transforming how work is performed across industries. A notable development is the rise of generative AI (gen AI), systems capable of producing text, images, code, and other content, which has drawn significant attention for its potential to enhance productivity and decision-making (Bommasani et al. 2021). Models such as Generative Pre-trained Transformers (GPTs) have demonstrated strong capabilities in content generation and problem-solving across diverse fields (Eloundou et al. 2024). Reflecting this momentum, a McKinsey report finds that organizational adoption of gen AI doubled to 65% by early 2024 (Singla et al. 2024). In customer service operations, where timely and effective customer interactions are essential for maintaining satisfaction and loyalty, gen AI presents unique opportunities to enhance both operational efficiency and customer satisfaction. Among various business functions, customer service is projected to gain some of the highest economic benefits from gen AI deployment due to its potential to automate repetitive tasks and assist human agents in delivering prompt, personalized responses (Chui et al. 2023). Despite these promising prospects, gen AI remains in its early stages, and systematic evaluations of its real- world impact on business operations are still limited. Therefore, the precise effects of gen AI deployment remain largely unquantified. The rise of gen AI has also sparked debate over its workforce implications, particularly whether it augments or hinders skill development. Some scholars argue that gen AI can enhance human capabilities by automating routine tasks, enabling workers to concentrate on complex activities requiring expertise and judgment (Agrawal A. et al. 2023, Autor 2024). Others caution that reliance on AI suggestions may erode skills, reducing independent decision-making and critical thinking (Agrawal N. et al. 2023). A related debate concerns whether gen AI narrows or widens performance gaps. While some suggest that AI could enable low performers to “catch up” by elevating their baseline competence, others argue that high performers may leverage AI to amplify their expertise, while low performers depend heavily on it for routine tasks, missing opportunities for skill development (Autor 2024). These debates underscore the importance of studying how gen AI affects performance distribution, particularly in customer service, where nuanced communication and interpersonal skills remain difficult for AI to emulate. To generate systematic evidence on the real-world effects of gen AI deployment, we partnered with Alibaba, a leading multinational e-commerce and technology company, to study the impact of gen AI in its customer service operations. Traditional AI tools, such as chatbots, can manage simple queries but often fail when issues are complex or nuanced. By contrast, gen AI assistants, trained on large corpora of historical agent-customer interactions, can provide context-specific support that may improve agent decision-making and service quality. In light of this, our study seeks to answer the following question: How does gen AI affect human agents’ performance in real-world customer service interactions, and do these 
effects vary across agents of different skill levels?

We explore these questions using a large-scale randomized field experiment in Alibaba’s e-commerce 
after-sales service division. Human agents were randomly assigned to either a control group, which handled 
customer chats without gen AI, or a treatment group, which had access to a gen AI assistant. The gen AI 
assistant offered two core functions: diagnosis of customer issues and solution proposals, both of which 
were presented as text suggestions that agents can copy and send to customers. Agents retained discretion 
to adopt, modify, or disregard these text suggestions, allowing us to study both the impact of gen AI access
and the effect of actual gen AI usage. Methodologically, we employ two approaches. First, we estimate the 
intention-to-treat (ITT) effect, capturing the average treatment effect of access to the gen AI assistant. 
Second, we apply a local average treatment effect (LATE) analysis to estimate the causal effect of actual 
gen AI usage.

Our results show that gen AI significantly improved agent performance along two key dimensions:
service speed and service quality.  On service speed, treated agents diagnosed and resolved issues more 
quickly, resulting in shorter issue identification times and reduced chat durations. We distinguish between 
subjective service quality, captured by customer ratings reflecting perceived service performance, and 
objective service quality, captured by customer retrial rates reflecting actual problem resolution. While gen 
AI improved subjective service quality, it had no significant effect on objective service quality. This 
suggests that gen AI primarily enhances customers’ perceptions of service—likely through more articulate, 
informative, and courteous communication—rather than improving the underlying effectiveness of issue 
resolution.

To  understand  why  overall  performance  improved,  we  examine  how  gen AI  reshaped  the 
communication dynamics of agent-customer interactions. On the agent side, it increased communication 
efficiency: agents responded more promptly, exchanged more messages, and used language that was more 
informative in terms of lexical density, clarity, and diversity, signaling greater cognitive effort. On the 
customer side, gen AI reduced communication burdens: customers uploaded fewer supporting pictures and 
used simpler language, suggesting that agents could more effectively diagnose and resolve issues with less 
effort required from customers. Taken together, these patterns  show that gen AI  enabled agents  to 
communicate  more  efficiently, while customers experienced less demanding interactions, thereby 
enhancing perceived service quality.
Further analysis reveals that the effects of gen AI were not uniform across agents. Segmenting agents that gen AI can function as a performance equalizer by elevating baseline outcomes among less skilled agents and narrowing the overall performance gap. By contrast, agents in the top performance quintile (the top 20%) achieved little improvement in service speed measured in chat durations despite a significant reduction in issue identification time. More surprisingly, they experienced declines in both subjective and objective service quality, as evidenced by lower customer ratings, higher dissatisfaction rates, and increased retrial rates. Consistent with these outcomes, the heterogeneous LATE estimates show that top-performing agents spent more shift-away times when managing concurrent chat sessions. This increased multitasking tendency slowed customer responses, raised customer abandonment, and triggered immediate retrials, ultimately reducing customer satisfaction. Alibaba’s internal survey further reveals that high-performing agents were more skeptical of gen AI, used its suggestions less frequently, and often invested additional effort to verify AI-generated outputs. Taken together, these changes indicate that gen AI reshaped the task structure and workflow of top performers, leading to changes in their customer interactions and, ultimately, in service quality. From a managerial perspective, these findings offer several insights for optimizing gen AI deployment. First, gen AI tools can generate substantial gains in both operational efficiency and customer satisfaction, two critical performance dimensions in e-commerce service. Second, the results highlight the value of tailoring deployment strategies to agents’ baseline performance. Prioritizing support for low performers can maximize productivity gains and ensure more consistent service outcomes. Third, gen AI’s capacity to reduce agent performance gap suggests that AI tools can play a strategic role in training and upskilling agents, helping organizations establish more uniform service standards. However, the decline in top agents’ performance cautions against a one-size-fits-all approach. Gen AI is more than just a productivity tool. It fundamentally reshapes the way people work, and if not managed carefully, it can disengage top performers by diminishing the value of their expertise. That is why managers need to design deployment strategies that keep their best talent engaged, challenged, and motivated. **2 Literature Review** Our study contributes to three major streams of research: (1) the impact of AI on worker productivity; (2) the impact of AI on employment and workforce; (3) behavioral dynamics in human-AI interaction. Each stream has grown rapidly in recent years, drawing attention from management, economics, and computer science. We extend the literature by providing large-scale, field experimental evidence on how gen AI influences agents’ service speed and quality, linguistic characteristics, workflow patterns, and performance heterogeneity in an e-commerce customer-facing service environment.

## 2.1 Impact of AI on Worker Productivity

---

Early research in management and operations conceptualized AI primarily as an automation technology for structured, repetitive tasks such as forecasting, scheduling, and routing (Van Donselaar et al. 2010, Sun et al. 2022, Boyacı et al. 2024). Although such systems substantially improve operational efficiency, their application in customer-facing services has been limited (Luo et al. 2019), where success depends equally on issue resolution and interpersonal communication (Schanke et al. 2021, Xu et al. 2024). Recent advances in gen AI have expanded the frontier of AI applications by enabling natural-language generation and interactive dialogue. Unlike traditional decision-support systems, gen AI performs both cognitive and emotional labor, allowing for more human-like exchanges with customers (Bamberger et al. 2023, Peng et al. 2023b, Brynjolfsson et al. 2025). However, current systems still struggle with nuanced or emotionally charged inquiries, prompting firms to adopt hybrid human-AI collaboration models that combine algorithmic support with human discretion. This hybrid approach aligns with the broader literature on human-AI collaboration in the context of improving worker productivity, where AI provides decision support and humans contribute contextual understanding (Snyder et al. 2025). Controlled lab experiments have shown that human-gen AI collaboration can enhance productivity across a range of knowledge tasks. For example, Peng et al. (2023a) find that software engineers using GitHub Copilot complete coding tasks more quickly, while Noy and Zhang (2023) demonstrate that ChatGPT improves both writing speed and quality, particularly for lower- skilled workers. Extending these findings to real-world settings, Cui et al. (2022) investigate how buyers’ use of AI influences suppliers’ pricing strategies, while Burtch et al. (2023) examine how ChatGPT affects user engagement on the user-generated content platform Stack Overflow. Zhang and Narayandas (2025) examine how AI affects worker productivity in terms of service speed and focus on analyzing customer sentiment in an online service setting. Beyond worker productivity, Dell’Acqua et al. (2023) caution that overlooking cognitive effort and human judgment in tasks beyond gen AI’s capabilities can diminish knowledge workers’ performance. Our study contributes to this line of research by offering causal evidence on the nuanced effects of a gen AI assistant in improving worker productivity in a real-world e-commerce service setting. In a large- scale field experiment at Alibaba’s after-sales service operations, we show that the gen AI assistant significantly improves service speed by reducing issue identification time and shortening chat duration, while also enhancing subjective service quality measured by customer ratings and dissatisfaction rates. However, it has limited impact on objective service quality measured by customer retrial rates. This contrasts with the finding of Brynjolfsson et al. (2025), who show that gen AI deployment on average had no statistical improvement in neither objective service quality indicated by resolution rates nor subjective service quality captured by net promoter score, an estimate of customer satisfaction (p.909, Table III). Moreover, by leveraging the granular process data, we demonstrate that agent productivity gains stem not only from automation, but also from changes in the dynamics of agent-customer interactions: agent communication becomes more informative and efficient, whereas customers experienced reduced communication burden, resulting in higher perceived service quality.

**2.2 Impact of AI on Employment and Workforce** A second literature stream examines AI’s broader implications for the workforce, focusing on its dual potential for augmentation and displacement. Several studies emphasize AI’s augmentation role. Autor (2024) argues that gen AI can democratize expertise and expand the scope of middle-skill work. Acemoglu et al. (2022a) and McElheran et al. (2024) show that AI adoption in large firms typically enhances existing capabilities rather than replacing workers. In operational contexts, Bai et al. (2022) show that productivity increases when AI-driven task allocation is perceived as fair. Conversely, other research highlights the risks of labor displacement and inequality. Zolas et al. (2021) document that AI-intensive job creation is concentrated in high-tech sectors, while Acemoglu et al. (2022b) report that AI adoption has not translated into wage growth. Capraro et al. (2024) and Lichtinger and Hosseini Massoum (2025) caution that gen AI may produce seniority-biased technological change, benefiting experienced workers disproportionately. Our study complements this literature by showing that gen AI can narrow, rather than widen, performance gap within the workforce. In our field setting, low-performing agents achieved the largest improvements in service efficiency and customer satisfaction. In contrast, top-performing agents achieved little improvement in service speed, and surprisingly experienced a substantial decline in both subjective service quality (customer rating and dissatisfaction rates) and objective service quality (customer retrial rates). This result is similar to the findings of Brynjolfsson et al. (2025). While Brynjolfsson et al. (2025) conjecture that the observed quality decline resulted from agents’ overreliance on AI suggestions, they offer no direct evidence. In contrast, using detailed process data from agent-customer interactions, we identify a novel behavioral mechanism that accounts for the quality decline among top-performing agents. In contrast to the conjecture in Brynjolfsson et al. (2025), we find that overreliance on AI suggestions does not explain the results in our setting. Both low- and high-performing agents produced more informative and clearer messages, as revealed by our textual analysis. Instead, top-performing agents exhibited a greater tendency to multitask, leading to higher customer abandonment and retrial rates, and ultimately reducing customer satisfaction.
## 2.3 Behavioral Dynamics in Human-AI Interaction

A third stream of research investigates the behavioral dynamics underlying human-AI interaction, with particular attention to overreliance and aversion (Lebovitz et al. 2022).

---

Studies on overreliance show that humans often defer excessively to algorithmic recommendations or 
reduce their effort when sharing responsibility with AI systems (Karau and Williams 1993). For example,
Dell’Acqua (2022) finds that workers often reduce their effort as AI tools improve, a phenomenon 
colloquially referred to as “falling asleep at the wheel.” Balakrishnan et al. (2025) and Snyder et al. (2025) 
demonstrate that individuals often overweight algorithmic predictions, especially when the system appears 
accurate, thereby amplifying automation bias. Relatedly, Bastani et al. (2025) observe that experiment 
participants integrate algorithmic advice with their own experience to improve performance, suggesting 
that reliance can be adaptive.

In contrast, research on  AI aversion demonstrates that users may underutilize AI, abandoning 
algorithms after minor mistakes (Dietvorst et al. 2018) or overriding recommendations in favor of personal 
expertise (Waardenburg et al. 2022, Caro and de Tejada Cuenca 2023). Aversion can be mitigated when 
users perceive tasks as objective (Castelo et al. 2019), understand algorithmic logic (Lehmann et al. 2022), 
or have the flexibility to adjust AI outputs (Dietvorst et al. 2018). Consistent with these findings, Hou et al. 
(2024) reveal that AI transparency and perceived smartness can improve adoption rates in online medical 
consultations.

Our study contributes to this literature by providing field-based evidence on how these behavioral 
patterns manifest in a real organizational context. We find that human agents do not uniformly adhere to 
gen AI’s suggestions and the adherence rate varies with skill level. In contrast to Brynjolfsson et al. (2025), 
we estimate the local average treatment effect (LATE), providing robust insights into the causal impact of 
actual AI  usage—instead of AI  access—on agent performance. This distinction helps illuminate the full 
potential of gen AI as the average adherence rate was low and the adherence behavior was highly variable 
across agents. Furthermore, our findings on how gen AI deployment affects customer service agents’ 
communication and multitasking patterns add nuanced behavioral mechanisms to the human-AI interaction 
literature.
3 Experiment Setup

In this study, we collaborated with Alibaba, the world’s largest e-commerce business measured by gross 
1
merchandise value (GMV) in the fiscal year of 2023. We  analyzed a large-scale randomized field 
experiment conducted on  Taobao, Alibaba’s flagship e-commerce platform that functions similarly to 
Amazon Marketplace. Taobao connects millions of merchants with consumers and handles a large volume 
of transactions, making it an ideal setting to study the effects of gen AI on customer service operations. As 
of November 2023, 84% of official customer service agents worked entirely remotely, while the rest worked

3 Experiment Setup

3.1 Company Background

1
Alibaba 2023 Annual Report, https://static.alibabagroup.com/reports/fy2023/ar/ebook/en/index.html from local offices. Each agent works independently, and their performance does not directly influence that 
of others.

3.2 Online After-Sales Service Chats

In our study, after-sales service chats are conducted through Alibaba’s digital platforms, enabling customers 
to interact with service agents via computers or mobile devices. A service chat includes all text exchanges
between a customer and an agent during an interactive session. We specifically focus on online after-sales 
customer support for order-related issues such as exchanges, returns, refunds, repairs, etc., which account 
for 56.5% of all customer chats and are the top reasons for customer inquiries. As of January 2024, Taobao’s 
average daily active users (DAUs) exceeded 380 million, with approximately 0.4 million daily demands 
for online after-sales chats during our experiment. To manage this high volume, Taobao employs a two-tier 
approach: customers initially interact with a chatbot that retrieves order histories and proposes a solution 
from a predefined set of actions. If these solutions do not resolve the issue, customers can be routed to
human agents through the same chat interface. This routing process is facilitated by a matching algorithm 
utilizing a greedy policy, which remained unchanged during the field experiment. Through live chats with 
customers, human agents then diagnose the issue and provide solutions. After a chat session ends, customers
are asked to rate the chat on a one-to-five scale, with the higher number being better.

3.3 The Gen AI Assistant

1) A diagnosis to identify the issues associated with a customer order.

In 2023, Alibaba developed a gen AI assistant to further augment human agent capabilities during online 
customer interactions. The gen AI assistant integrates Alibaba’s Qwen large language models (LLMs) with 
machine learning algorithms specifically fine-tuned for Taobao’s customer support scenarios. It was trained 
on  extensive datasets, including  service  chats, order details, and  customer information, to identify
conversational patterns crucial for diagnosing and resolving customer issues. Once deployed, the gen AI 
assistant provided agents with two types of message suggestions for use during customer chats:

2) A solution to resolve the customer issues.

---

Figure  1 illustrates an example of the gen AI assistant’s functions. In this instance, the gen AI assistant 
produces two lines of text. The first line identifies the issue (e.g., “We noticed that the product (ID: 1000) 
you purchased isn’t suitable for you. You have applied for an exchange, and we are currently waiting for 
the seller’s approval.”). The second line proposes a potential solution (e.g., “Would you like to expedite 
this exchange process?”). These suggestions are designed to help agents respond promptly at the start of 
each chat session.

[Image: Im1]

Figure 1: An Illustration of the Gen AI Assistant’s Functions

The gen AI-suggested messages are visible only to agents, who may choose to  use, modify, or 
disregard them in their chats with customers. If agents choose to use the messages,  they can send them 
directly with a single click. If they choose to modify them, they can copy the messages to the chat interface 
and revise them before sending. If they disregard the messages, they must manually compose responses to 
the customers.

3.4 Experiment Design

Alibaba conducted a four-week randomized A/B test from January 23, 2024, to February 19, 2024, to assess 
the impact of the gen AI assistant on the performance of after-sales customer service agents. This largescale field test involved 5,940 new customer service agents (tenure less than one year), resulting in roughly 
2.56 million chats and 0.39 million customer ratings. Out of the 5,940 agents, 2,895 (48.7%) were randomly 
assigned to the treatment group and 3,045 (51.3%) were randomly assigned to the control group by their 
agent ID. Note that our sample represents 15.6% of Taobao’s official customer service agents at the time of 
2
the experiment.

2
In this study, all experiment participants were official Taobao agents rather than the agents affiliated with individual sellers.  Official Taobao 
agents are responsible for managing all after-sales customer issues for the entire platform, including complaints and disputes.

---

**Figure 2: Experiment Timeline**

Figure 2 outlines the experiment timeline, spanning eight weeks or roughly two months including the

pretreatment period. The first month (12/26/2023 – 1/22/2024) is the pretreatment period when the gen AI assistant was unavailable to any agent. The second month (1/23/2024 – 2/19/2024) is the treatment period during which treated agents were provided access to the gen AI assistant, while control agents were not. The field test concluded on February 19, 2024, and the gen AI assistant was officially launched and became available to all agents the following day.

**Figure 3: Experiment Treatment Process**

Figure 3 presents a schematic overview of the treatment process. As described in Section 3.2, after

interacting with the customer service chatbot, customers may request to be transferred to a human agent. At this point, customers were assigned to either a treated or control agent using the same matching algorithm employed prior to the experiment. Control agents had access only to the standard support tools, while treated agents were presented with an additional message box displaying suggested responses generated by the gen AI assistant (as detailed in Section 3.3). Treated agents could choose to use, modify, or disregard 
the AI suggestions.

3.5 Data Structure

Our  dataset  contains three components:  agent information,  session logs, and  chat content.  Agent
information includes treatment assignment, gender, age, and tenure for each agent.  Session logs contain 
structured attributes of each service interaction, including Chat ID, Agent ID, Customer ID, start and end 
times, concurrency, issue category, issue  identification time,  agent  typing time,  agent  response time, 
customer rating, and any follow-up contacts.  Chat content includes message details such as the sender 
identity, exact timestamp, message type, and message content. We merge these data sources to construct a 
chat-level dataset comprising over 2.56 million chats and 0.39 million customer ratings generated during
the field experiment. Table 1 shows the summary statistics of major variables used in our analysis, grouped 
by agent demographics, agent performance, and agent-customer interaction measures. 
Among all participating agents, the average agent age was 32 years, and 18% of them are male. Figure

Next, we compute several agent performance measures: (1) Issue identification time, defined as the 
elapsed time between the start of a chat and the confirmation of the customer’s issue (see Online Appendix 
C3 for a detailed description on chat stage labeling); (2) Chat duration, defined as the total time from the 
start to the end of a chat; (3) Customer retrial within 3 days, a binary indicator equal to one if the customer 
returned with the same issue within three days. On average, issue identification takes 35.53 seconds, and
chat sessions last 465.62 seconds. About 38% of customers recontacted the platform for the same issue 
within three days.

Within each chat session, we construct a comprehensive set of interaction measures to capture the 
dynamics of agent-customer  communication.  First, we compute the response time for both  agents and 
customers, defined as the cumulative delay before replying to the other party’s messages. Next, we calculate 
the number of messages exchanged by each party. On average, agents sent 11.69 messages and customers 
sent 11.27 messages per chat. Across all sessions, the average response time was 172.66 seconds for agents
and 261.64 seconds for customers.

---

A distinctive feature of our setting is that agents can handle multiple customer chats simultaneously and frequently switch between concurrent chats. To capture this multitasking behavior, we analyze overlapping chat session timelines and construct the following measures: (1) Concurrency, the number of simultaneous chats the agent was handling at the start of the focal chat (mean = 2.68); (2) Agent shift-away *time, the cumulative time the agent spent away from the focal chat (mean = 189.25 seconds); and (3) Agent* *active time, the total time the agent was actively engaged in the focal chat (mean = 276.64 seconds).* To capture chat textual characteristics, we extract the total number of words and messages sent by both the agent and the customer in each chat session. Also, we construct three lexical measures based on Read (2000) to quantify the linguistic properties of messages: (1) Lexical density, defined as the ratio of content words (e.g., nouns, verbs, adjectives) to total words, which reflects the informational richness of the message; (2) Lexical clarity, measured by the average number of Chinese characters per message, reflecting message elaboration; (3) Lexical diversity, operationalized using entropy, calculated as −∑# $%&!#, where # represents the frequency of each content word. Higher entropy values indicate greater variation in word usage, and thus more diverse language. These measures are computed separately for both agents and customers. To test randomization and ensure comparability between the treatment and control groups, we check balance across 24 key variables. A nonparametric test shows that all p-values for pretreatment variables are above 0.118, indicating no significant differences between the treatment and control groups. Detailed results of this balance check are presented in Table A1 in the Online Appendix. In addition, Figure A3 demonstrates parallel pretreatment trends between treated and control agents across key outcome variables, while Figure A4 displays the discrete distributions of customer ratings of treated and control agents during the pretreatment period. Together, these results confirm the validity of our experimental design, indicating that observed treatment-control differences can be causally attributed to the deployment of the gen AI assistant.

## 4 Empirical Strategy

In this section, we first define dependent variables as service speed and service quality in Section 4.1. We then define independent variables as gen AI access and gen AI usage in Section 4.2. Finally, we introduce our ITT and LATE estimation methods in Sections 4.3 and 4.4, respectively.

## 4.1 Dependent Variables: Service Speed and Service Quality

We first aggregate the chat-level data to the agent-day level. This structure allows us to leverage the panel nature of the data for rigorous difference-in-differences (DID) analyses, which rely on within-agent variation over time. We evaluate the gen AI assistant’s treatment effects on agent performance using two sets of measures: service speed and service quality.

---

## Service speed. We measure service speed using the following time-based variables: chat duration and

issue identification time. Chat duration ('") represents the total time a customer spends in a chat session. Issue identification time ('#) refers to the time taken to identify the customer’s issue at the beginning of the session. Both measures are commonly used in customer service management in evaluating service efficiency. Shorter durations may indicate greater operational efficiency and lower labor costs, although potentially at the expense of service quality (Goes et al. 2018, Altman et al. 2021). Figure A5 in the Online Appendix illustrates these speed measures in a hypothetical chat session. The chat starts at 9:00:30 when the agent sends the message “Hello, you are connected to your service representative Henry.” The issue is identified at 9:01:30 when the customer responds “Yes , pl eas e. ” The chat ends at 9:09:30 with the message “Nothing else. Thank you!” In this example, issue identification time is one minute, and chat duration is nine minutes. 3 ***Service quality. In this study, we use both objective and subjective quality measures. The subjective*** quality measures include customer ratings and dissatisfaction rate. The customer rating (($) represents customers’ overall satisfaction, calculated across rated chats on each agent-day. The dissatisfaction rate ((%) is the proportion of rated chats receiving a score below three (i.e., 1 or 2) on a scale of five. For objective quality, we estimate gen AI’s impact on the three-day retrial rate ((&), defined as the proportion of chats that led to a follow-up contact from the same customer regarding the same issue within three days. This metric is used by Alibaba to assess whether an issue was ultimately resolved. It has also been widely used in prior research as a proxy for lasting resolution effectiveness (Hu et al. 2022).

## 4.2 Independent Variables: Gen AI Access and Gen AI Usage

In the field experiment, the treatment is to provide access of the gen AI assistant to agents. Hence, the variable )*+,-indicates gen AI access at the agent level. However, treated agents have the option to follow or disregard the suggestions of gen AI for each chat session. This feature allows us to record agents’ gen AI usage behaviors, e.g., whether, and to what extent an agent adheres to gen AI’s suggestions. At the chat level, we measure agents’ gen AI usage using two binary variables: ."and .'. ."= 1 if an agent directly sends gen AI suggested messages without modifications in a chat, i.e., a complete adherence, and

.'= 1 if an agent partially uses gen AI suggested messages by copying and editing before sending them to the customer, i.e., a partial adherence. An agent is considered to have used the gen AI assistant in a chat if either ."= 1 or .'= 1, i.e., if the agent completely or partially uses gen AI’s suggestions. If both ." and .'are zero, the agent disregards the gen AI’s suggestions. The reason why chat duration can be much longer than issue identification time is because agents need to contact sellers or backend systems to secure approval for the proposed solutions.

---

Based on these measures, we construct a continuous variable 1+2.3_56,&+, defined as the proportion of chats on each agent-day in which an agent either fully or partially adhered to the gen AI assistant (i.e., ."= 1 or .'= 1). 4

Table 2 shows the summary statistics of agent usage of the gen AI

assistant. At the agent-day level, the average gen AI usage rate is 0.287, and at the chat level, the average rate is 0.215. The complete adherence rate is 0.219, about three times of the partial adherence rate of 0.070. To further understand agents’ gen AI usage behavior, we plot the distribution of gen AI usage during the treatment period, as shown in Figure A6. The distribution is asymmetric, bimodal, and positively skewed, forming a reverse “J-shape.” At the extremes, 17.9% of treated agents did not use the gen AI assistant at all, while 6.2% used it in every assigned chat. Usage rates among the remaining agents are highly heterogeneous. We performed an OLS analysis to examine the antecedents of gen AI usage for treated agents, incorporating factors like gender, age, and tenure. Detailed results are reported in Table A2. Treated agents with shorter tenure, lower pretreatment concurrency, lower pretreatment customer ratings, and longer pretreatment chat durations tend to exhibit higher usage of gen AI. Next, we examine how gen AI usage evolved during the treatment period. Figure A7 illustrates the average daily usage rate among treated agents, revealing a clear upward trend. This increase likely reflects agents’ growing familiarity with the gen AI assistant, which may have reduced their initial skepticism toward the technology. This pattern is further supported by Figure A8, which shows the average daily rates of complete and partial adherence to the gen AI assistant for treated agents. The figure reveals a steady increase in complete adherence, while partial adherence remains relatively stable throughout the experiment. Given the relatively low usage rates in our setting, it is important to distinguish between the causal effect of gen AI access and that of gen AI usage. To achieve this, we estimate the intention-to-treat effect of gen AI access (see Section 4.3) and the local average treatment effect of gen AI usage (see Section 4.4), thereby accounting for variations in individual gen AI usage levels.

## 4.3 Estimating Gen AI’s Intention-to-Treat (ITT) Effect

We first apply the difference-in-differences (DID) method to estimate the ITT effect of gen AI, i.e., the average treatment effect of having access to gen AI, regardless of whether gen AI’s suggestions are utilized or not (Duflo 2001). The specification is given as follows:

7 ()= ,*+,+)*+,-()+ :(+;)+ <(,)-++ =(), (1)

This measure is computed across all chats in a day, regardless of whether they received a customer rating.

---

5
where  7 ∈ {ln('"), ln('#), ($, (%, (&}. The subscript  F denotes agents, and  -denotes calendar days. :(
represents agent fixed effects,  ;)represents day fixed effects, and  =()captures  random error.  <(,)-+
includes a set of lagged time-variant control variables, such as the lagged average daily concurrency and
customer tenure experienced by  agent  F on the previous day.)*+,-()equals 1  if agent  F is in the 
treatment group and day -falls within the treatment period (i.e., 1/23/2024 – 2/19/2024), and 0 otherwise.
The coefficient ,+captures the gen AI assistant’s  ITT effect on the outcome variable. Robust standard 
errors are clustered at the agent level for all regressions in this study.

Y\in\{\mathrm{l n}(P_{c}),\mathrm{l n}(P_{s}),\mathcal{Q}_{r},\mathcal{Q}_{l},\mathcal{Q}_{d}\}

\epsilon_{i t}

X_{i,t-1}

\mu_{t}

T r e a t_{i t}

a_{1}

4.4 Estimating Gen AI’s Local Average Treatment Effect (LATE)

Besides the conservative ITT estimates of the treatment effect,  we utilize an instrumental variable (IV)
method to examine how varying levels of gen AI usage affect outcome variables, i.e., the gen AI’s LATE 
effect. To implement this, we employ a fuzzy Difference-in-Differences design that leverages variation in 
access-induced usage to address imperfect compliance, allowing us to identify the LATE for agents whose 
usage was induced by having access (De Chaisemartin and D’Haultfoeuille 2018). The  empirical 
specifications are as follows:

First Stage:

Gmathit n A I\_{J l a g e}_{i t}=\alpha_{0}+\alpha_{1}T r e a t_{i t}+\theta_{i}+\mu_{t}+X_{i,t-1}+\nu_{i t},

(2)

Second Stage:

Y_{i t}=\beta_{0}+\beta_{1}G e n A\overline{{I_{-}U}}s a g e_{i t}+\theta_{i}+\mu_{t}+X_{i,t-1}+\epsilon_{i t},

T r e a t_{i t}

\mu_{t}

X_{i,t-1}

To  address potential endogeneity concerns, such as selection bias  arising if agents  with higher 
pretreatment  customer  ratings  were less likely to use the  gen AI assistant, we  employ the random 
assignment  of gen AI access as an  IV for actual gen AI usage, i.e.,  we use  )*+,-()as an IV for
1+2.3_56,&+(). Because )*+,-()is randomized at the agent level, we instrument for heterogenous gen 
AI usage at the agent level rather than at the chat level. The coefficient of  1+2.3K _56,&+, denoted by J, 
() +
captures the local average treatment effect of varying levels of gen AI usage on the outcome variable for 
compliers, that is, agents whose usage increased as a result of being granted access.

t.^{6}

T r e a t_{i t}

G e n A I\_U s a g e_{i t}

5
The service speed measures are log-transformed because they have large standard deviations relative to their means.
6
In our dataset, treatment conditions are randomized at the agent level, while gen AI usage and the outcome measures are observed at the chat

\ Y_{i t})

---

For the IV to be valid for the LATE estimation framework, three conditions must be satisfied (Angrist
and Imbens 1995, Angrist and Pischke 2009). First, the inclusion condition necessitates that the random 
assignment of agents to the treatment condition correlates with the usage of gen AI’s suggestions. This is 
ensured by our experiment design, where only agents in the treatment group had access to the  gen AI
assistant. Second, the exclusion condition states that the IV must influence the dependent variables solely 
by affecting the agents’ likelihood of using the gen AI assistant. This condition can be further divided into 
two components. The first component requires that the IV is independent of any other variables that could 
affect the  dependent variables. This is satisfied because our IV,  )*+,-(), is randomly assigned among 
agents and thus independent of other variables. The second component requires that the IV must not directly 
affect the dependent variables. Regarding this assumption, one potential concern is that the gen AI assistant 
might interfere with an agent’s work other than ways of agents copying and sending the gen AI suggested 
messages, thereby affecting their performance. However, this concern appears unlikely in our setting since 
the gen AI’s suggested messages were displayed in a modeless dialogue box, which would not alter the 
agent’s original screen display in the chat interface.  To further  mitigate this concern,  we  follow  Va n  
Kippersluis and Rietveld (2018) and perform a placebo test on the subset of treated agents who never used 
the gen AI assistant (i.e., the so-called “never-takers”). The estimation results presented in Table A3 in the 
Online Appendix indicate no statistically significant treatment effects on key dependent variables for the 
“never-takers,” thereby providing strong support for the validity of the exclusion condition. Finally, the 
monotonicity condition requires that having access to the gen AI assistant cannot decrease the likelihood of 
agent using it, which is naturally satisfied in our setting.

T r e a t_{i t}

We begin by examining the distributions of the main dependent variables. Figure  A9 presents the 
distributions of service speed and service quality measures for treated agents during the pretreatment and 
treatment periods. Panels (a), (b), and (c) show leftward shifts in the distributions of issue identification 
time, chat duration, and dissatisfaction rate following the deployment of the gen AI assistant, indicating 
reductions in these measures. Panel (d) shows a rightward shift in customer ratings, suggesting 
improvements. Panel (e) displays no  noticeable  distributional changes in  three-day retrial rate. These
descriptive patterns suggest that treated agents generally achieved faster service and higher quality in the treatment month, though not all measures exhibit clear shifts. The summary statistics reinforce this interpretation: after gen AI deployment, the average issue identification time decreases from 41.18 seconds to 38.61 seconds, and average chat duration falls from 534.22 seconds to 507.58 seconds. Customer ratings improve from 3.16 to 3.27, while dissatisfaction rates decline from 0.43 to 0.40. Meanwhile, the retrial rate remains stable at 0.39. In the following sections, we formally estimate the causal effects of the gen AI assistant on these dependent variables using regression analyses.

**5.2 Gen AI’s ITT Effect**
Table 3 presents the estimated ITT effect of access to the gen AI assistant. For service speed, Columns (1)
 and (2) indicate that access to the gen AI assistant reduced issue identification time and chat duration by
8.2% and 1.1%, respectively, corresponding to absolute reductions of 3.2 seconds and 5.7 seconds. For service quality, Columns (3) and (4) show that access to the gen AI assistant decreased the dissatisfaction rate by 0.012 (a 3.4% improvement relative to the pretreatment mean of 0.35) and raised average customer ratings by 0.042 points on a five-point scale (a 1.2% improvement over the pretreatment mean of 3.46).
7 Column (5) shows a near-zero and statistically insignificant effect on three-day retrial rate. All estimations are statistically significant except for retrial rate. Overall, the deployment of the gen AI assistant led to sizeable improvements in both service speed and quality, though effects on customer retrials remain negligible.

## 5.3 Gen AI’s LATE Effect

The ITT estimations reflect the causal impact of access to the gen AI assistant on agent performance. We next estimate the local average treatment effect (LATE) of actual gen AI usage, as shown in Tables 4A and 4B. In both tables, Column (1) shows the statistically significant first-stage estimation of using )*+,-to instrument for 1+2.3_56,&+. For service speed, Table 4A Columns (2)–(3) present the second-stage estimates, indicating that 100% gen AI usage decreases issue identification time by 32.3% and chat duration by 4.2%. For service quality, Table 4B Columns (2) and (3) show that 100% gen AI usage lowers the dissatisfaction rate by 0.054, (a 15.4% improvement over the pretreatment mean of 0.35) and raises average customer ratings by 0.184 points on a five-point scale (a 5.3% improvement relative to the pretreatment mean of 3.46). Column (4) reports a near-zero and statistically insignificant effect on three-day retrial rate. 8 Overall, the LATE estimates are statistically significant and about four times of the ITT estimates in magnitude.

We estimated the gen AI assistant’s impact on customers’ likelihood to rate the chat, and the effect is close to zero. See Table A4 for details. For robustness, we also use the seven-day retrial rate as the dependent variable, and the estimated coefficient remains similar in magnitude and statistically insignificant.

---

In summary, the deployment of the gen AI assistant led to significant improvements in both service speed and service quality. The improvement in service quality appears to be driven primarily by enhancements in customers’ perceived service experience, as reflected in higher ratings, rather than by improvements in objective quality measures, as indicated by the unchanged three-day retrial rate. Because the LATE estimation method accounts for agents’ actual extent of gen AI usage, we present the LATE estimates as the main results in the remainder of the paper and use the ITT estimates as a robustness check.

## 5.4 Mechanisms for Gen AI’s Impact on Agent Performance

By design, the gen AI assistant can augment agent capabilities by assisting in identifying and resolving customer issues through its diagnosis and solution proposal functions. These core functions allow agents to identify customer problems more efficiently and deliver tailored responses, thereby reducing issue identification time and shortening overall chat duration, as shown in Sections 5.2 and 5.3. Beyond these direct mechanisms, a more nuanced but equally important question is whether the use of gen AI alters the nature of service interactions and the linguistic patterns of communication between agents and customers. Viewing each service interaction as a co-production process, it is not immediately clear whether reliance on gen AI encourages agents to exert greater cognitive effort (Brynjolfsson et al.

2025) or to shirk at work (Dell’Acqua 2022). To examine this, we analyze detailed measures of agent- customer interactions, focusing on two sets of variables: (1) Agent-customer chat process measures, including response time, number of messages, and typing time on the agent side; response time, number of messages, and number of uploaded pictures on the customer side; (2) Chat textual characteristics, including lexical density, clarity, and diversity for both agents and customers. Detailed variable definitions and examples are provided in Online Appendices C1 and C2. We first estimate the gen AI assistant’s LATE effects on agent-customer chat process measures. Table 5 Columns (1) and (2) show that 100% gen AI usage reduces agent response time by 6.8% and increases the number of agent messages by 1.213, indicating an acceleration effect on agent responsiveness. Both effects are statistically significant. Interestingly, Table 5 Column (3) shows that gen AI usage does not significantly affect agents’ typing time, implying that agents did not reduce their own communication effort when assisted by gen AI’s suggestions. In other words, although gen AI partially automates message generation for diagnosis and solution purposes, agents continued to compose messages actively. On the customer side, Table 5 Columns (4) and (5) show that 100% gen AI usage has a negative but statistically insignificant effect on customer response time and the number of customer messages. However, Column (6) shows that 100% gen AI usage significantly reduces the number of customer-uploaded pictures by 0.102, an 11.0% reduction relative to the pretreatment mean of 0.93. Because customers typically upload pictures to illustrate their problems, this reduction suggests that agents assisted by gen AI were more effective in diagnosing problems, thereby lowering the need for customers to provide additional visual information. We next estimate the LATE effects of gen AI usage on textual characteristics of agent and customer messages, specifically lexical density, clarity, and diversity. Lexical density is defined as the ratio of content words (such as nouns, verbs, adjectives) to the total word count in a message, reflecting its informational richness. Lexical clarity is measured by the average number of Chinese characters per message, capturing elaboration and precision. Lexical diversity is operationalized using entropy, where higher values indicate greater variation in word usage and, consequently, more diverse linguistic expression. These measures, commonly used to assess readability, information richness, and linguistic sophistication (e.g., Goes et al. 2014, Qiao et al. 2020), serve as proxies for cognitive effort and communication quality during service interactions. On the agent side, Table 6 Columns (1)–(3) show that all three linguistic measures significantly increase with gen AI usage, indicating greater cognitive engagement and more informative expression. Conversely, Table 6 Columns (4)–(6) indicate that customer interacting with gen AI-assisted agents exhibit lower lexical complexity, consistent with reduced communication effort and simpler message construction. Together, these results highlight gen AI’s dual role: it enhances agents’ language sophistication while simultaneously reducing customers’ communicative burden. For robustness, Tables A5 and A6 in the Online Appendix report ITT estimates of gen AI for agent- customer chat processes and textual characteristics. Although the magnitudes are smaller, the estimated effects are consistent in direction with the LATE estimates. To further explore how gen AI impacts agent-customer interactions, we decompose each chat into three sequential stages: (1) issue identification and solution proposal, (2) resolution, and (3) confirmation. A detailed description of this decomposition, along with the construction of the agent-customer message *ratio (the number of agent messages divided by customer messages), is provided in Online Appendix C3.* The message ratio serves as a proxy for the agent’s relative contribution during each chat stage.

Table 7 presents the estimated LATE effects of gen AI usage on the agent-customer message ratios

across stages. Two key insights emerge. First, agents exhibit higher engagement overall, reflected in a larger agent-customer message ratio throughout the chat duration. Second, this heightened engagement is most pronounced during the issue identification and solution proposal, as well as confirmation stages. This is likely due to gen AI’s automation of diagnosis and solution proposal, which reduces the cognitive load on agents, allowing them to devote more effort to customer engagement. The message ratio during the resolution stage remains statistically unchanged, likely because agents follow standardized decision paths to resolve customer issues.

---

In summary, these analyses reveal that the gen AI assistant improves agent performance not only by automation but also by reshaping the interaction between agents and customers. By automating diagnosis and solution formulation, gen AI enables agents to respond more quickly. Furthermore, gen AI does not *reduce agents’ communication effort; rather, it promotes more informative and efficient communication,* *thereby alleviating customers’ communication*

---

Taken together, these results indicate that gen AI improves issue identification speed for all agents, but the benefits for chat duration are concentrated among lower-performing agents, with limited or no effects for top performers.

## 6.1.2 Gen AI’s Heterogeneous LATE Effects on Service Quality

We next examine the heterogeneous effects of gen AI on service quality, distinguishing between subjective and objective measures. For subjective quality, measured by customer ratings and dissatisfaction rates, the effects exhibit a clear monotonic pattern across performance levels (Table 8 Columns (3)–(4)). At 100% gen AI usage rate, Q1 agents benefit the most: their dissatisfaction rate decreases by 0.567 (# < 0.01) and their customer ratings increase by 2.144 (# < 0.01). These effects decline steadily with higher baseline performance, becoming insignificant for Q4 and reversing for Q5, where dissatisfaction rates increase by 0.374 (# <

0.01) and ratings fall by 1.514 (# < 0.01).
11 For objective quality, measured by the three-day retrial rate, gen AI usage has no statistically significant effects for Q1–Q4 agents (Table 8 Columns (5)). The only exception is Q5 (i.e., top quintile), where customer retrial rate increases by 0.041 (# < 0.05), again indicating a quality decline among top performers. Taken together, these results show that gen AI substantially improves subjective quality for lower- performing agents, with benefits diminishing toward the top of the performance distribution. Objective quality remains largely unaffected except for Q5 agents, who experience a decline. Notably, all service quality measures for top performers (Q5) deteriorate. These results are corroborated by model-free comparisons of average pretreatment and posttreatment customer ratings across performance quintiles, reported in Table A7 of the Online Appendix. Consistent with the regression results, Q1 agents’ ratings increase by 0.797 points (from 2.184 to 2.981), Q2 by 0.264 (from 2.881 to 3.145), Q3 by 0.135 (from

3.271 to 3.406), and Q4 by 0.029 (from 3.637 to 3.666), whereas Q5 agents experience a decline of 0.162 points (from 4.008 to 3.846). Despite this decline, Q5 agents continue to have the highest customer ratings, and the rating rankings of Q1–Q5 agents remain unchanged posttreatment. Importantly, these results are not driven by differences in task type or complexity. As shown in Table A8, service request complexity and task types remain consistent for treated agents in different quintiles across the pretreatment and posttreatment periods. We further investigate the mechanisms underlying the decline in Q5 agents’ service quality in Section 6.2. In the paper, we report LATE estimates based on 100% gen AI usage. In practice, the actual treatment effects must be scaled by agents’ actual usage rates.

---

## 6.2 Mechanisms for Gen AI’s Effect in Reducing Performance Gaps

The heterogeneous analysis in Section 6.1 identifies two main performance patterns following the introduction of the gen AI assistant. First, the service speed gap narrows: low-performing agents show significant improvements in chat duration, while high performers show limited or no change. All groups, however, benefit from faster issue identification. Second, the service quality gap also narrows: low performers achieve notable gains in service quality, whereas the highest performers experience a significant decline. Similar patterns have been observed in prior work. Brynjolfsson et al. (2025) report that high-skilled agents in a B2B customer support context experienced reductions in service quality after adopting a gen AI assistant. While the authors identify the phenomenon, the underlying mechanisms remain speculative. The authors conjectured that the quality decline of high-skilled agents might be due to overreliance on AI’s lower quality textual outputs. Although intuitive, no direct evidence was provided to support this conjecture. Furthermore, this mechanism, even if it’s true, may not generalize to Alibaba’s B2C e-commerce after-sales environment, where agents face distinct communication demands that are characterized by two patterns: (1) much shorter chat durations (a few minutes) than in the B2B IT support setting of Brynjolfsson et al. (close to an hour), and (2) agents manage multiple concurrent chats as opposed to typically a single chat in the setting of Brynjolfsson et al. To examine the mechanisms underlying heterogeneous performance effects, we analyze granular changes in both agent and customer messaging behaviors using detailed process and textual data. We first test whether the quality decline stems from high performers’ overreliance on AI-generated messages. Our text-embedding analysis, detailed in Online Appendix D, measures cosine similarity between the language used by Q1 and Q5 agents. As shown in Figure A10, gen AI usage increases textual similarity between low- and high-performing agents, particularly at higher usage rates. This convergence reflects agents’ adoption of AI-generated suggestions trained on shared historical data, leading to greater homogenization of message content across performance quintiles. However, increased textual similarity does not necessarily imply deterioration in message quality among high performers. Next, we estimate heterogeneous LATE effects on linguistic measures of lexical density, clarity, and diversity, reported in Table 9. We find consistent improvements across all quintiles for all three measures, with no significant differences between low and high performers. Thus, gen AI uniformly enhances linguistic features, and we find no evidence that high performers’ message quality deteriorates. Complementary survey evidence from 834 customer support agents with access to the gen AI assistant provides behavioral insight into these patterns, as detailed in Online Appendix E. High performers reported being more skeptical of AI suggestions, less likely to adopt them, and more likely to invest time verifying their accuracy. Indeed, actual gen AI usage declines monotonically with pretreatment agent performance, with rates of 0.39, 0.25, 0.22, 0.18, and 0.18 from Q1 to Q5, which further suggests that overreliance is *unlikely the reason to explain the observed quality decline.* Instead, we explore an alternative mechanism rooted in agents’ workflow patterns. Contrasting the B2B setting in Brynjolfsson et al. (2025), our B2C environment requires agents to manage multiple concurrent chats, often switching between them. In this setting, the gen AI assistant may have altered the task structure for top performers by changing the level of cognitive effort required, which in turn reshaped how they interacted with customers during chat sessions. Although gen AI automates diagnosis and solution proposals, high performers may have reallocated their freed capacity toward monitoring and verifying AI suggestions, resulting in more shift-away times from the focal chat. Prior research shows that frequent task- switching imposes cognitive costs, extends completion times, and degrades performance (Jersild 1927, Rubinstein et al. 2001, KC and Staats 2012). We hypothesize that gen AI induces greater task-switching among top performers, which reduces workflow continuity, prolongs customer response times, and ultimately reduces service quality. Our empirical evidence supports this mechanism. Table 10 Column (1) indicates that 100% gen AI usage reduces agent response time for low performers (−14.4% for Q1, −7.1% for Q2, −15.3% for Q3) but has no significant effect for Q4 or Q5 agents. This pattern explains why low-performing agents achieved greater speed improvement than high-performing agents. On the customer side, Table 10 Column (4) shows that customer response time decreases for Q1 and Q3 agents (−9.7% and −6.7%) but increases by 9.6% for Q5 agents. This suggests that customers become less engaged when interacting with top performers posttreatment. To measure chat-switching more directly, we construct three behavioral metrics: (1) active time, which captures the duration agents actively engage with a specific chat, (2) shift-away time, representing the cumulative time when agents shift away from the focal chat (calculated as total chat duration minus active time), and (3) share of shift-away time, the proportion of time spent away from the focal chat (shift-away time divided by total chat duration). Detailed definitions are provided in Appendix C4. Table 11 presents the heterogeneous LATE estimates. At 100% gen AI usage, the shift-away time decreases for Q1–Q4 agents (−31.2%, −14.7%, −15.4%, and −20.5%) but increases by 26.3% for Q5 agents. The share of shift-away time shows a similar pattern, confirming that top performers spend a greater proportion of time away from their focal chats posttreatment. These prolonged shift-aways can negatively affect agent-customer interactions in two ways. On the agent side, they likely increase setup costs when agents return to focal chats, delaying their responses, which explains why high performers’ response times did not decrease as they did for low performers. On the customer side, agents’ extended shift-aways may cause customers to lose attention or patience, leading to slower responses, higher abandonment or retrials, ultimately lowering customer satisfaction. Consistent with this interpretation, Table 8 Column (5) reveals that only Q5 agents experience a 4.1 percentage point increase in the three-day retrial rate (# < 0.05). Decomposing retrials further, Table 11 Columns (3)–(4) show that the increase is concentrated in immediate retrials (within ten minutes), suggesting that customers who disengaged mid-chat quickly attempted to reconnect. **7 Conclusion** This study leverages a large-scale field experiment conducted on Alibaba’s e-commerce platform to causally estimate the impact of a gen AI assistant on customer service agents’ performance. Our findings demonstrate that gen AI deployment leads to significant performance gains. These gains are particularly pronounced when agents adhere to AI’s suggestions, resulting in faster service speed and increased customer satisfactions. The mechanisms behind these performance gains stem from the way the gen AI assistant operates. By automating critical tasks such as issue diagnosis and solution formulation, the gen AI assistant enables agents to respond more swiftly to customer inquiries, leading to a noticeable reduction in service time. Beyond task automation, the gen AI assistant enhances the quality of agent communication—making it more informative and precise—which alleviates customers’ communication burden and significantly improves their experience in chat interactions. Our study also reveals that gen AI narrows the performance gap between low and high performers. This result presents both opportunities and challenges for organizations. On the positive side, gen AI tools can significantly boost the performance of low-skilled agents by offering better support, resources, and automation, thereby leveling the playing field and raising the overall standard of service. To maximize returns, organizations should prioritize deploying gen AI assistants among low- and mid-skilled workers, where the productivity gains are likely to be greatest. On the other hand, we also observed that top performers experienced a decline in service quality, likely driven by increased multitasking tendency, reflected in longer shift-away times across concurrent chats. This shift reduced the continuity of their workflow, disengaged customers, and ultimately leading to higher customer abandonment and dissatisfaction. These results underscore that realizing the full benefits of gen AI requires tailoring deployment to workers’ skill levels. For top performers, AI systems should be designed to augment rather than replace their expertise, achieving efficiency gains without undermining worker motivation or engagement. However, this balance may become difficult to maintain as sophisticated AI systems approach expert-level performance. Organizations should therefore consider redesigning roles and creating new job opportunities to retain top talent—for instance, redeploying them to contribute directly to AI system training, thereby leveraging their expertise to enhance model performance.

---

Our study is not without limitations. Notably, it captures only the short-term effects of deploying gen AI. Future research should investigate the long-term impact of gen AI on agent learning and adaptation through longitudinal studies. We also leave several open questions for future exploration: How will gen AI influence workforce structure and worker welfare over time? What strategies can firms adopt to incentivize and retain top talent in an AI-driven environment? How can gen AI be enhanced to address the issue of low AI adherence, and should firms encourage greater adherence? If so, how can this be effectively achieved?

**Reference** **Acemoglu, D., Anderson, G. W., Beede, D. N., Buffington, C., Childress, E. E., Dinlersoz, E., ... & Zolas,**

**N. (2022a). Automation and the workforce: A firm-level view from the 2019 Annual Business Survey. Technical** Report w30659, National Bureau of Economic Research. **Acemoglu, D., Autor, D., Hazell, J., & Restrepo, P. (2022b). Artificial intelligence and jobs: Evidence from** online vacancies. Journal of Labor Economics, 40(S1), S293-S340. **Agrawal, A., Gans, J. S., & Goldfarb, A. (2023). Do we want less automation? AI may provide a path to** decrease inequality. Science, 381 (6654) 155-158. **Agarwal, N., Moehring, A., Rajpurkar, P., & Salz, T. (2023). Combining human expertise with artificial** intelligence: Experimental evidence from radiology. Technical Report w31422, National Bureau of Economic *Research.* **Altman, D., Yom-Tov, G. B., Olivares, M., Ashtar, S., & Rafaeli, A. (2021). Do customer emotions affect** agent speed? An empirical study of emotional load in online customer contact centers. Manufacturing & Service *Operations Management, 23(4), 854-875.* **Angrist, J. D., & Imbens, G. (1995). Identification and estimation of local average treatment effects. National** *Bureau of Economic Research.* **Angrist, J. D., & Pischke, J. S. (2009). Mostly harmless econometrics: An empiricist’s companion. Princeton** *University Press.* **Autor, D. H. (2024). Applying AI to rebuild middle class jobs. Technical Report w32140, National Bureau of** *Economic Research.* **Bai, B., Dai, H., Zhang, D. J., Zhang, F., & Hu, H. (2022). The impacts of algorithmic work assignment on** fairness perceptions and productivity: Evidence from field experiments. Manufacturing & Service Operations *Management, 24(6), 3060-3078.* **Balakrishnan, M., Ferreira, K. J., & Tong, J. ( 2025).** Human-Algorithm Collaboration with Private Information: Naïve Advice Weighting Behavior and Mitigation. Management Science, forthcoming. **Bamberger, S., Clark, N., Ramachandran, S., & Sokolova, V. (2023). How generative AI is already** transforming customer service. Boston Consulting Group, 6.

---

## Bastani, H., Bastani, O., & Sinchaisri, W. P. (2025). Improving human sequential decision making with

reinforcement learning. Management Science, forthcoming. **Bommasani, R., Hudson, D. A., Adeli, E., Altman, R., Arora, S., von Arx, S., ... & Liang, P. (2021). On the** opportunities and risks of foundation models. arXiv preprint arXiv:2108.07258. **Boyacı, T., Canyakmaz, C., & De Véricourt, F. (2024). Human and machine: The impact of machine input on** decision making under cognitive limitations. Management Science, 70(2), 1258-1275. **Brynjolfsson, E., Li, D., & Raymond, L. (2025). Generative AI at work. The Quarterly Journal of Economics,** 140(2), 889-942. **Burtch, G., Lee, D., & Chen, Z. (2023). The consequences of generative AI for UGC and online community** engagement. Available at SSRN: 4521754. **Capraro, V., Lentsch, A., Acemoglu, D., Akgun, S., Akhmedova, A., Bilancini, E., ... & Viale, R. (2024). The** impact of generative artificial intelligence on socioeconomic inequalities and policy making. PNAS nexus, 3(6). **Caro, F., & de Tejada Cuenca, A. S. (2023).** Believing in analytics: Managers’ adherence to price recommendations from a DSS. Manufacturing & Service Operations Management, 25(2), 524-542. **Chui, M., Hazan, E., Roberts, R., Singla, A., Smaje, K., Sukharevsky, A., Yee, L., & Zemmel, R. (2023).** The economic potential of generative AI. McKinsey & Company, 1-68. **Cui, R., Li, M., & Zhang, S. (2022). AI and procurement. Manufacturing & Service Operations Management,** 24(2), 691-706. **De Chaisemartin, C., & D’Haultfoeuille, X. (2018). Fuzzy differences-in-differences. The Review of Economic** *Studies, 85(2), 999-1028.* **Dell’Acqua, F. (2022). Falling asleep at the wheel: Human/AI collaboration in a field experiment on HR** recruiters. Working Paper, Laboratory for Innovation Science, Harvard Business School. **Dell’Acqua, F., McFowland III, E., Mollick, E. R., Lifshitz-Assaf, H., Kellogg, K., Rajendran, S., ... &** **Lakhani, K. R. (2023). Navigating the jagged technological frontier: Field experimental evidence of the effects** of AI on knowledge worker productivity and quality. Available at SSRN: 4573321. **Dietvorst, B. J., Simmons, J. P., & Massey, C. (2018). Overcoming algorithm aversion: People will use** imperfect algorithms if they can (even slightly) modify them. Management Science, 64(3), 1155-1170. **Duflo, E. (2001). Schooling and labor market consequences of school construction in Indonesia: Evidence from** an unusual policy experiment. American Economic Review, 91(4), 795-813. **Eloundou, T., Manning, S., Mishkin, P., & Rock, D. (2024). GPTs are GPTs: Labor market impact potential** of LLMs. Science, 384 (6702), 1306-8. **Goes, P. B., Ilk, N., Lin, M., & Zhao, J. L. (2018). When more is less: Field evidence on unintended** consequences of multitasking. Management Science, 64(7), 3033-3054.

---

**Goes, P. B., Lin, M., & Au Yeung, C. M. (2014). “Popularity effect” in user-generated content: Evidence from** online product reviews. Information Systems Research, 25(2), 222-238. **Hou, T., Li, M., Tan, Y., & Zhao, H. (2024). Physician adoption of AI assistant. Manufacturing & Service** *Operations Management, 26(5), 1639-1655.* **Hu, K., Allon, G., & Bassamboo, A. (2022). Understanding customer retrials in call centers: Preferences for** service quality and service speed. Manufacturing & Service Operations Management, 24(2), 1002-1020. **Jersild, A. T. (1927). Mental set and shift. Columbia university.** **Karau, S. J., & Williams, K. D. (1993). Social loafing: A meta-analytic review and theoretical integration.** *Journal of personality and social psychology, 65(4), 681.* **KC, D. S., & Staats, B. R. (2012). Accumulating a portfolio of experience: The effect of focal and related** experience on surgeon performance. Manufacturing & Service Operations Management, 14(4), 618-633. **Lebovitz, S., Lifshitz-Assaf, H., & Levina, N. (2022). To engage or not to engage with AI for critical judgments:**

---

**Rubinstein, J. S., Meyer, D. E., & Evans, J. E. (2001). Executive control of cognitive processes in task** switching. Journal of experimental psychology: human perception and performance, 27(4), 763. **Schanke, S., Burtch, G., & Ray, G. (2021). Estimating the impact of “humanizing” customer service chatbots.** *Information Systems Research, 32(3), 736-751.* **Singla, A., Sukharevsky, A., Yee L., Chui, M., & Hall, B. (2024). The State of AI in early 2024: Gen AI** adoption spikes and starts to generate value. McKinsey & Company. **Snyder, C., Keppler, S., & Leider, S. (2025). Algorithm reliance: Fast and slow. Management Science,** forthcoming. **Sun, J., Zhang, D. J., Hu, H., & Van Mieghem, J. A. (2022). Predicting human discretion to adjust algorithmic** prescription: A large-scale field experiment in warehouse operations. Management Science, 68(2), 846-865. **Van Donselaar, K. H., Gaur, V., Van Woensel, T., Broekmeulen, R. A., & Fransoo, J. C. (2010). Ordering** behavior in retail stores and implications for automated replenishment. Management Science, 56(5), 766-784. **Van Kippersluis, H., & Rietveld, C. A. (2018). Beyond plausibly exogenous. The Econometrics Journal, 21(3),** 316-331. **Waardenburg, L., Huysman, M., & Sergeeva, A. V. (2022). In the land of the blind, the one-eyed man is king:** Knowledge brokerage in the age of learning algorithms. Organization science, 33(1), 59-82. **Xu, Y., Dai, H., & Yan, W. (2024). Identity disclosure and anthropomorphism in voice chatbot design: A field** experiment. Management Science, forthcoming. **Zhang, S., & Narayandas, D. (2025). Engaging customers with AI in online chats: Evidence from a randomized** field experiment. Management Science, forthcoming. **Zolas, N., Kroff, Z., Brynjolfsson, E., McElheran, K., Beede, D. N., Buffington, C., Goldschlag, N., Foster,**

**L., & Dinlersoz, E. (2021). Advanced technologies adoption and use by us firms: Evidence from the annual** business survey. Technical Report w28290, National Bureau of Economic Research.

---

Table 1. Summary Statistics

| Variables | Definition | Obs. | Mean | SD |
| --- | --- | --- | --- | --- |
| Agent Demographics |  |  |  |  |
| treat | 1 if agent was exposed to the gen AI assistant, and 0 otherwise | 5,940 | 0.49 | 0.50 |
| gender | 1 if agent is male, and 0 otherwise | 5,940 | 0.18 | 0.38 |
| tenure | total time since an agent began their role(days) | 5,940 | 123.84 | 53.94 |
| age | agent age | 5,940 | 31.75 | 6.10 |
| Agent Performance |  |  |  |  |
| Service Speed |  |  |  |  |
| identification time | time taken to identify the customer&#x27;s issue(seconds) | 2,507,730 | 35.53 | 70.66 |
| chat duration | total duration of a chat(seconds) | 2,564,606 | 465.62 | 447.15 |
| Service Quality |  |  |  |  |
| customer rating | customer rating of the chat,从1到5 with higher number being better | 388,793 | 3.49 | 1.80 |
| if dissatisfied | 1 if the chat receives a rating of1 or2 | 388,793 | 0.34 | 0.47 |
| customer retrial in 3 days | 1 if the customer returns with the same issue within 3 days | 2,564,606 | 0.38 | 0.49 |
| Agent-Customer Interaction Measures |  |  |  |  |
| Agent Measures |  |  |  |  |
| concurrency | number of chats an agent serves simultaneously when starting a focal chat | 2,564,265 | 2.68 | 1.07 |
| agent response time | total delay before agent replies to customer messages(seconds) | 2,563,026 | 172.66 | 178.13 |
| agent active time | total time an agent spends on the focal chat(seconds) | 2,562,964 | 276.64 | 296.24 |
| agent shift-away time | total time an agent is away from the focal chat(seconds) | 2,562,964 | 189.25 | 269.09 |
| agent typing time | total time an agent spends typing messages(seconds) | 2,532,419 | 105.02 | 111.46 |
| number of agent messages | total number of messages sent by the agent during a chat | 2,564,606 | 11.69 | 8.26 |
| agent lexical density | ratio of content words to total words in agent messages during a chat | 2,558,463 | 0.50 | 0.09 |
| agent lexical clarity | Average characters per agent message during a chat | 2,558,467 | 15.7 | 7.28 |
| agent lexical diversity | entropy of content words in agent messages during a chat | 2,558,467 | 4.42 | 1.26 |
| Customer Measures |  |  |  |  |
| customer tenure | total time since a customer joined platform(years) | 2,564,606 | 7.48 | 3.77 |
| customer response time | total delay before customer replies to agent messages(seconds) | 2,563,061 | 261.64 | 301.61 |
| number of customer messages | total number of messages sent by the customer during a chat | 2,564,606 | 11.27 | 10.98 |
| number of customer pictures | total number of pictures sent by the customer during a chat | 2,559,053 | 0.89 | 1.74 |
| customer lexical density | ratio of content words to total words in customer messages during a chat | 2,549,030 | 0.56 | 0.14 |
| customer lexical clarity | Average characters per customer message during a chat | 2,550,289 | 8.85 | 11.69 |
| customer lexical diversity | entropy of content words in customer messages during a chat | 2,550,289 | 3.75 | 1.24 |

Table 2. Agent Usage of Gen AI: Summary Statistics

| Variables | Obs. | Mean | SD |
| --- | --- | --- | --- |
| Agent-Day Level Statistics for Treated Agents |  |  |  |
| GenAI Usage Rate | 29,006 | 0.287 | 0.363 |
| Complete Adherence Rate | 29,006 | 0.219 | 0.339 |
| Partial Adherence Rate | 29,006 | 0.070 | 0.198 |
| Chat Level Statistics for Treated Agents |  |  |  |
| GenAI Usage Rate | 543,651 | 0.215 | 0.411 |
| Complete Adherence Rate | 543,651 | 0.171 | 0.377 |
| Partial Adherence Rate | 543,651 | 0.044 | 0.206 |

!"#$%&' OI/@g#/(DSSAI4V/hb@ABCDSD/"CaD#DIbDh/@bbg#(/iaDI/"I/"4DIS/"C@BS(/gIA@CAMADC/4DI1O/@gSBgS(/AI/
"/ba"SN/hB"#SA"C/"CaD#DIbDh/a"BBDI(/iaDI/"I/"4DIS/g(D(/B"#S/@M/4DI1O/@gSBgS(/AI/"/ba"S/%l/DCASAI4/SaD/
SDmSG/MDI1O/g("4D/AIbCgCD(/%@Sa/b@ABCDSD/"IC/B"#SA"C/"CaD#DIbDG/

---

Table  3. Gen AI’s ITT Effects

|  | Service Speed |  | Service Quality |  |  |
| --- | --- | --- | --- | --- | --- |
| ln(identification time)(1) | ln(chat duration)(2) | dissatisfaction rate(3) | customer rating(4) | retrial rate(within 3 days)(5) |  |
| Treat | -0.082***(0.012) | -0.011**(0.005) | -0.012***(0.005) | 0.042**(0.018) | 0.000(0.002) |
| Agent Fixed Effects | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y |
| Observations | 125,821 | 126,365 | 97,354 | 97,354 | 126,365 |
| R-Squared | 0.335 | 0.236 | 0.159 | 0.164 | 0.084 |

No t es .  Ob s erv at i o n s  i n  Co l u mn  (1 ) are l es s  t h an  i n  Co l u mn  (2 ) b ecau s e s o me cu s t o mers  o r ag en t s  may  q u i t  t h e ch at  b efo re o r i mmed i at el y  aft er ag en t  as s i g n men t . In  
Column (3), dissatisfied customers rated the chat 1-2 stars. *p<0.1; **p<0.05; ***p<0.01. Robust standard errors are clustered by agent.

Table 4A. Gen AI’s LATE Effects on Service Speed

|  | First Stage | Second Stage |  |
| --- | --- | --- | --- |
| GenAI_Usage(1) | ln(identification time)(2) | ln(chat duration)(3) |  |
| Treat | 0.254***(0.007) |  |  |
| GenAI_Usage |  | -0.323***(0.046) | -0.042**(0.020) |
| Agent Fixed Effects | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y |
| Observations | 126,365 | 125,821 | 126,365 |

No t es .   Ob s erv at i o n s  i n  Co l u mn s  (2 ) are l es s  t h an  i n  Co l u mn s  (1 ) an d  (3 ) b ecau s e s o me cu s t o mers  o r ag en t s  may  
quit before or immediately after agent assignment. *p<0.1; **p<0.05; ***p<0.01. Robust standard errors are 
clustered at the agent level.

Table 4B. Gen AI’s LATE Effects on Service Quality

|  | First Stage | Second Stage |  |  |
| --- | --- | --- | --- | --- |
| GenAI_Usage(1) | dissatisfaction rate(2) | customer rating(3) | retrial rate(within 3 days)(4) |  |
| Treat | 0.228***(0.007) |  |  |  |
| GenAI_Usage |  | -0.054***(0.021) | 0.184**(0.079) | 0.000(0.009) |
| Agent Fixed Effects | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y |
| Observations | 97,354 | 97,354 | 97,354 | 126,365 |

!"#$%&'' N3F.14#O!OG.-A+F!GO#!1A!G!/-n#bF.GO!F0GR#!GAI!I-FFG.-F/-#I!03F.14#OF!OG.-A+F!GO#!m#R1T!.UO##!F.GOFA!CTr@AYs!CCTr@A@cs!CCCTr@A@YA!t1m3F.!F.GAIGOI!
#OO1OF!GO#!0R3F.#O#I!G.!.U#!G+#A.!R#n#RA

---

**Table 5. (Mechanism) Gen AI’s LATE Effects on Agent-Customer Chat Process**

!"#A%CDE"C%FG+I%-

**Table 6. (Mechanism) Gen AI’s LATE Effects on Chat Textual Characteristics**

**Table 7. (Mechanism) Gen AI’s LATE Effects on Agent-Customer Message Ratios Across Chat Stages**

---

Table  8. Gen AI’s Heterogeneous LATE Effects: Quintile Partition of Agent Pretreatment 
Performance

|  | Service Speed |  | Service Quality |  |  |
| --- | --- | --- | --- | --- | --- |
| ln(identification time)(1) | ln(chat duration)(2) | dissatisfaction rate(3) | customer rating(4) | retrial rate(within 3 days)(5) |  |
| GenAI_Usage | -0.168**(0.082) | -0.148***(0.037) | -0.567***(0.052) | 2.144***(0.199) | -0.000(0.018) |
| GenAI_Usage×Q2 Agents | -0.194*(0.107) | 0.096*(0.050) | 0.390***(0.062) | -1.507***(0.236) | -0.003(0.023) |
| GenAI_Usage×Q3 Agents | -0.294***(0.107) | 0.058(0.044) | 0.479***(0.058) | -1.823***(0.221) | -0.007(0.021) |
| GenAI_Usage×Q4 Agents | -0.210*(0.110) | 0.162***(0.048) | 0.603***(0.058) | -2.270***(0.223) | -0.017(0.022) |
| GenAI_Usage×Q5 Agents | -0.015(0.117) | 0.207***(0.053) | 0.941***(0.070) | -3.657***(0.272) | 0.041*(0.024) |
| Impact on Q1 Agents | -0.168** | -0.148*** | -0.567*** | 2.144*** | -0.000 |
| Impact on Q2 Agents | -0.362** | -0.053 | -0.177*** | 0.636*** | -0.003 |
| Impact on Q3 Agents | -0.462*** | -0.090*** | -0.088*** | 0.321*** | -0.007 |
| Impact on Q4 Agents | -0.378*** | 0.013 | 0.037 | -0.126 | -0.017 |
| Impact on Q5 Agents | -0.183** | 0.059 | 0.374*** | -1.514*** | 0.041** |
| Agent Fixed Effects | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y |
| Observations | 122,055 | 122,554 | 95,561 | 95,561 | 122,554 |

No t es . *p<0.1; **p<0.05; ***p<0.01. Robust standard errors are in parenthesis.

Table  9. Gen AI’s Heterogeneous LATE Effects on Agent-Customer Chat Textual Characteristics

|  | Agent |  |  | Customer |  |  |
| --- | --- | --- | --- | --- | --- | --- |
|  | lexical density(1) | lexical clarity(2) | lexical diversity(3) | lexical density(4) | lexical clarity(5) | lexical diversity(6) |
| GenAI_Usage | 0.036***(0.004) | 2.901***(0.321) | 0.621***(0.056) | -0.011**(0.005) | -0.636(0.466) | -0.165***(0.051) |
| GenAI_Usage×Q2Agents | -0.004(0.006) | 0.091(0.427) | 0.095(0.074) | -0.002(0.006) | -0.341(0.543) | 0.010(0.065) |
| GenAI_Usage×Q3Agents | -0.001(0.006) | -0.361(0.442) | 0.106(0.073) | -0.009(0.006) | -0.258(0.478) | 0.043(0.058) |
| GenAI_Usage×Q4Agents | -0.001(0.006) | 0.283(0.467) | 0.074(0.076) | -0.010*(0.006) | -0.489(0.496) | 0.106*(0.062) |
| GenAI_Usage×Q5Agents | -0.003(0.006) | 0.311(0.501) | -0.036(0.083) | -0.012*(0.007) | 0.501(0.603) | 0.102(0.069) |
| Impact on Q1 Agents | 0.036*** | 2.901*** | 0.621*** | -0.011** | -0.636 | -0.165*** |
| Impact on Q2 Agents | 0.033*** | 2.992*** | 0.715*** | -0.013*** | -0.977*** | -0.155*** |
| Impact on Q3 Agents | 0.036*** | 2.540*** | 0.727*** | -0.019*** | -0.894*** | -0.122*** |
| Impact on Q4 Agents | 0.036*** | 3.184*** | 0.694*** | -0.021*** | -1.125*** | -0.059 |
| Impact on Q5 Agents | 0.033*** | 3.212*** | 0.584*** | -0.023*** | -0.136 | -0.063 |
| Agent Fixed Effects | Y | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y | Y |
| Observations | 122,545 | 122,545 | 122,545 | 122,540 | 122,541 | 122,541 |

---

**Table 10. Gen AI’s Heterogeneous LATE Effects on Agent-Customer Chat Process**

!"#A%CDE"C%FG+I%-

**Table 11. Gen AI’s Heterogeneous LATE Effects on Agent Shift-Aways & Customer Retrials**

---

# Generative AI in Action: Field Experimental Evidence from Alibaba’s Customer Service Operations

## Online Appendix

## Appendix A. Figures

## Figure A1. Distribution of Agent Tenure at the Time of Experiment

## Figure A2. Customer Rating Response Rates for Treated and Control Agents Over Time

---

Figure A3-A. Visual Evidence of Parallel Pretreatment Trends
Service Speed

(a) issue identification time

(b) chat duration

Service Quality

Notes: These figures present the daily average performance of agents in the treatment and control groups during the 
pretreatment period. The x-axis denotes days relative to the treatment start date (Day 0), and the y-axis indicates 
average agent performance at the chat level. As a time-sensitive metric, it displays periodic fluctuations.

Figure A3-B. Statistical Tests of Parallel Pretreatment Trends

Service Speed

(a) issue identification time

(e) retrial rate (within 3 days)

Notes: These plots show the coefficients and 95% confidence intervals for the parallel pre-trend tests.

---

Figure A5. Process Measures for a Hypothetical Chat Session

---

Figure A6. Distribution of Treated Agents’ Gen AI Usage

Notes. Gen AI usage includes both complete adherence (i.e., use gen AI recommendations with no modification) and 
partial adherence (i.e., use modified gen AI recommendations). Usage rates are reported at the agent-day level.

Figure A7. Average Gen AI Usage Over Time

Notes. Gen AI usage includes both complete and partial adherence. Average usage rates are calculated over all treated 
agents in a day. The error bars indicate 95% confidence intervals.

---

Figure A8. Complete and Partial Adherence to Gen AI Over Time

Notes. Average adherence rates are calculated over all treated agents in a day. The error bars indicate 95% 
confidence intervals.

Figure A9. Model-Free Evidence

Service Speed

(a) issue identification time

(d) customer rating

Notes: These figures illustrate the distributional changes in treated agents’ performance between the pretreatment and 
treatment periods. The x-axis represents average performance at the agent-month level, while the y-axis indicates the 
corresponding density.

---

Figure A10. Cross-Agent Cosine Similarity Comparison

Notes. In this analysis, treated agents are partitioned into five quintiles based on their pretreatment customer ratings. 
We then compute the weekly average cosine message similarity between agents in the lowest (Q1) and highest (Q5) 
performance quintiles.

---

Appendix B. Tables
Table A1. Balance Check

|  | treated717,650 | control717,270 | p-value |
| --- | --- | --- | --- |
| Chat Information |  |  |  |
| issue identification time (seconds) | 34.88(0.67) | 36.40(0.71) | 0.120 |
| chat duration (seconds) | 474.93(2.31) | 475.69(2.18) | 0.815 |
| if rated | 0.15(0.00) | 0.15(0.00) | 0.526 |
| agent response time (seconds) | 174.91(1.20) | 175.15(1.14) | 0.888 |
| customer response time (seconds) | 269.59(1.20) | 269.21(1.12) | 0.818 |
| number of agent messages | 11.90(0.07) | 11.83(0.07) | 0.497 |
| number of customer messages | 11.49(0.04) | 11.46(0.04) | 0.641 |
| number of customer pictures | 0.93(1.77) | 0.93(1.79) | 0.520 |
| total agent typing time (seconds) | 109.45(1.03) | 110.46(0.94) | 0.471 |
| concurrency | 2.46(0.01) | 2.45(0.01) | 0.313 |
| agent lexical density | 0.50(0.00) | 0.50(0.00) | 0.291 |
| agent lexical clarity | 15.78(0.10) | 15.72(0.10) | 0.649 |
| agent lexical diversity | 4.43(0.01) | 4.41(0.01) | 0.274 |
| customer lexical density | 0.55(0.00) | 0.55(0.00) | 0.477 |
| customer lexical clarity | 8.92(0.01) | 8.93(0.01) | 0.711 |
| customer lexical diversity | 3.77(0.00) | 3.77(0.00) | 0.684 |
| agent active time | 290.91(1.70) | 293.51(1.71) | 0.280 |
| agent shift-away time | 184.34(1.45) | 182.50(1.18) | 0.325 |
| customer retrial in 3 days | 0.39(0.00) | 0.39(0.00) | 0.988 |

---

|  | treated2,895 | control3,045 | p-value |
| --- | --- | --- | --- |
| Agent Informationtenure(days) | 124.96(54.50) | 122.77(53.38) | 0.118 |
| age | 31.76(6.10) | 31.74(6.11) | 0.930 |
| gender(M=1) | 0.18(0.39) | 0.17(0.38) | 0.281 |
|  | treat108,948 | control108,306 | p-value |
| Customer RatingInformationrating | 3.46(0.01) | 3.46(0.01) | 0.958 |
| if dissatisfied | 0.35(0.00) | 0.35(0.00) | 0.970 |

Table A 2. Antecedents of Treated Agents’ Gen AI Usage

|  | GenAI_Usage |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
|  | (1) | (2) | (3) | (4) | (5) |
| Male | -0.007(0.017) | -0.009(0.017) | -0.020(0.017) | -0.022(0.017) | -0.018(0.017) |
| Age | -0.002**(0.001) | -0.002**(0.001) | -0.001(0.001) | -0.002**(0.001) | -0.002*(0.001) |
| ln(Tenure) |  | -0.038**(0.013) | -0.051***(0.018) | -0.045**(0.018) | -0.041**(0.018) |
| High Pretreatment Customer Rating |  |  | -0.095***(0.013) | -0.070***(0.014) | -0.067***(0.014) |
| High Pretreatment Concurrency |  |  |  | -0.105***(0.014) | -0.097***(0.014) |
| High Pretreatment Chat Duration |  |  |  |  | 0.031**(0.014) |
| Constant | 0.412***(0.035) | 0.588***(0.069) | 0.658***(0.093) | 0.684***(0.092) | 0.650***(0.093) |
| Observations | 2,856 | 2,856 | 2,482 | 2,482 | 2,482 |

|  | Service Speed |  | Service Quality |  |  |
| --- | --- | --- | --- | --- | --- |
|  | ln(identification time)(1) | ln(chat duration)(2) | dissatisfaction rate(3) | customer rating(4) | retrial rate(within 3 days)(5) |
| Treat | 0.010(0.019) | -0.008(0.008) | -0.011(0.008) | 0.039(0.030) | -0.000(0.003) |
| Agent Fixed Effects | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y |
| Interaction Controls | Y | Y | Y | Y | Y |
| Observations | 1,415,461 | 1,480,420 | 223,601 | 223,601 | 1,480,420 |

\ {{\tttt**^{p0.1;*^{*p00.5}}}}^{***{*}}{{\tt p0}}0.01

No t es .  *p<0.1; **p<0.05; ***p<0.01. Agent tenure (days) is log-transformed. We use the median of pretreatment rating (i.e., 3.28 out of 5), the 
median pretreatment concurrency (i.e., 2.03), and the median pretreatment chat duration (i.e., 507.13) to classify agents. Standard errors are in 
parenthesis.

Table A 3. Placebo Test: Gen AI’s ITT Impact on “Never-Takers” in the Treatment Group

---

Table A 4. Gen AI’s Effects on the Customer’s Likelihood to Rate a Chat

|  | if rated(1) |
| --- | --- |
| Treat | 0.0001 |
| (0.001) |  |
| Agent Fixed Effects | Y |
| Day Fixed Effects | Y |
| Interaction Controls | Y |
| Observations | 2,564,265 |

Table A 5. Gen AI’s ITT Effects on Agent-Customer Chat Process

|  | Agent |  |  | Customer |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| ln(response time)(1) | # of messages(2) | ln(typing time)(3) | ln(response time)(4) | # of messages(5) | # of pictures(6) |  |
| Treat | -0.017***(0.005) | 0.308***(0.049) | 0.005(0.006) | -0.003(0.006) | -0.078(0.064) | -0.026***(0.010) |
| Agent Fixed Effects | Y | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y | Y |
| Observations | 126,356 | 126,365 | 125,631 | 126,361 | 126,365 | 126,352 |
| R-Squared | 0.299 | 0.369 | 0.480 | 0.164 | 0.140 | 0.109 |

Notes. Observations in Columns (1),(3),(4),(6) are less than in Columns (2),(5) because some customers or agents may quit before or immediately after agent assignment. $ ^{*} \mathrm{p} < 0. 1; $ $ ^{* *} \mathrm{p} < 0. 0 5; $ $ ^{* * *} \mathrm{p} < 0. 0 1 $ . Robust standard errors are clustered at the agent level.

Table A 6. Gen AI’s ITT Effects on Agent-Customer Chat Textual Characteristics

|  | Agent |  |  | Customer |  |  |
| --- | --- | --- | --- | --- | --- | --- |
|  | lexical density(1) | lexical clarity(2) | lexical diversity(3) | lexical density(4) | lexical clarity(5) | lexical diversity(6) |
| Treat | 0.009*** | 0.749*** | 0.173*** | -0.004*** | -0.212*** | -0.027*** |
| -0.001 | -0.053 | -0.009 | (0.001) | (0.049) | (0.006) |  |
| Agent Fixed Effects | Y | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y | Y |
| Observations | 126,352 | 126,352 | 126,352 | 126,347 | 126,348 | 126,348 |
| R-Squared | 0.617 | 0.629 | 0.490 | 0.100 | 0.107 | 0.131 |

Table A7. Average Customer Ratings of Treated Agents Across Performance Quintiles

---

Table  A8.  Distribution of Customer Issue Categories for Treated Agents Across Performance 
Quintiles

|  | pretreatment |  |  |  |  | posttreatment |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| category | Q1 | Q2 | Q3 | Q4 | Q5 | Q1 | Q2 | Q3 | Q4 | Q5 |
| refund | 77.82% | 77.76% | 77.52% | 77.30% | 77.00% | 77.80% | 77.04% | 76.93% | 76.89% | 77.09% |
| shipping fee | 14.57% | 14.80% | 14.85% | 14.96% | 14.78% | 12.91% | 13.91% | 13.87% | 13.50% | 13.11% |
| exchange | 2.73% | 2.81% | 2.83% | 2.82% | 3.13% | 3.11% | 3.02% | 2.93% | 3.10% | 3.18% |
| reshipment | 1.68% | 1.75% | 1.86% | 1.97% | 1.98% | 2.05% | 2.35% | 2.45% | 2.55% | 2.61% |
| repair | 1.08% | 1.07% | 1.16% | 1.13% | 1.13% | 1.18% | 1.17% | 1.20% | 1.17% | 1.12% |
| others | 2.12% | 1.81% | 1.78% | 1.82% | 1.98% | 2.95% | 2.51% | 2.62% | 2.79% | 2.89% |

Table A9. Gen AI’s LATE Effects (with Agent-Hour Level Data)

|  | Service Speed |  | Service Quality |  |  |
| --- | --- | --- | --- | --- | --- |
| ln(identification time)(1) | ln(chat duration)(2) | dissatisfaction rate(3) | customer rating(4) | retrial rate(within 3 days)(5) |  |
| GenAI_Usage | -0.374***(0.053) | -0.075***(0.021) | -0.049**(0.019) | 0.179**(0.073) | -0.004(0.008) |
| Agent Fixed Effects | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y |
| Hour Fixed Effects | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y |
| Observations | 579,117 | 588,066 | 265,208 | 265,208 | 588,066 |

No t es .  *p<0.1; **p<0.05; ***p<0.01. Robust standard errors are clustered by agent.

Table A10. Gen AI’s LATE Heterogeneous Effects (with Agent-Hour Level Data)

|  | Service Speed |  | Service Quality |  |  |
| --- | --- | --- | --- | --- | --- |
| ln(identification time)(1) | ln(chat duration)(2) | dissatisfaction rate(3) | customer rating(4) | retrial rate(within 3 days)(5) |  |
| GenAI_Usage | -0.399***(0.081) | -0.213***(0.034) | -0.553***(0.049) | 2.088***(0.190) | -0.004(0.016) |
| GenAI_Usage×Q2 Agents | -0.115(0.110) | 0.099**(0.046) | 0.377***(0.058) | -1.424***(0.224) | 0.004(0.021) |
| GenAI_Usage×Q3 Agents | -0.110(0.110) | 0.065(0.044) | 0.458***(0.055) | -1.734***(0.213) | -0.011(0.019) |
| GenAI_Usage×Q4 Agents | 0.134(0.113) | 0.220***(0.047) | 0.557***(0.055) | -2.078***(0.214) | -0.015(0.020) |
| GenAI_Usage×Q5 Agents | 0.238*(0.118) | 0.242***(0.055) | 0.815***(0.070) | -3.163***(0.270) | 0.042*(0.023) |
| Impact on Q1 Agents | -0.399*** | -0.213*** | -0.553*** | 2.088*** | -0.004 |
| Impact on Q2 Agents | -0.514*** | -0.113*** | -0.176*** | 0.664*** | 0.000 |
| Impact on Q3 Agents | -0.509*** | -0.148*** | -0.095*** | 0.354*** | -0.015 |
| Impact on Q4 Agents | -0.265*** | 0.007 | 0.005 | 0.011 | -0.018 |
| Impact on Q5 Agents | -0.161* | 0.029 | 0.263*** | -1.075*** | 0.038** |
| Agent Fixed Effects | Y | Y | Y | Y | Y |
| Day Fixed Effects | Y | Y | Y | Y | Y |
| Hour Fixed Effects | Y | Y | Y | Y | Y |
| Time-Variant Controls | Y | Y | Y | Y | Y |
| Observations | 569,173 | 577,818 | 262,345 | 262,345 | 577,818 |

---

## Appendix C. Definitions of Agent-Customer Interaction Measures

We provide detailed definitions of the variables used in our analyses to capture various dimensions of agent- customer interactions. These variables are grouped into four categories: (1) agent-customer chat process measures; (2) agent-customer chat textual characteristics measures; (3) agent-customer message ratio across chat stages; (4) agent task-switching measures.

## C1. Agent-Customer Chat Process Measures

To capture the dynamics of agent-customer conversation and assess the level of agent and customer engagement, we construct a set of interaction process measures from session logs and chat content, including: agent response time, number of agent messages, and agent typing time; customer response time, number of customer messages, and number of customer pictures. All time-related measures are recorded in seconds. **Figure A11. Agent-Customer Chat Process Measures for a Hypothetical Chat Session**

*Agent response time and customer response time capture the total delay each party exhibits in replying* to the other, based on the timestamps of exchanged messages in the chat. The number of agent messages and number of customer messages refer to the total number of messages sent by each party during a chat and reflect the overall intensity of engagement during a chat session. Agent typing time is obtained from session logs, which tracks the duration the agent’s cursor remains within the message input box, serving as a proxy for effort. The number of customer pictures is defined as the count of image-type messages sent by the customer, as identified by message type labels. *Example: Figure A11 in the Online Appendix illustrates these agent-customer interaction measures in* a hypothetical chat session. For the agent, there is only one instance where his message (“I have urged … within 2 hours.” – 9:08:00) is preceded by the customer’s message (“Yes, please.” – 9:01:30). This results in a total agent response time of 6.5 minutes. For the customer, there are two instances (at 9:01:30 and 9:09:30) where her messages directly follow the agent’s messages (at 9:01:00 and 9:08:30). Therefore, the total customer response time is 1.5 minutes. The customer sends two messages. The agent sends five messages during the chat and spends a total of 0.5 minutes typing them.

## C2. Agent-Customer Chat Textual Characteristics Measures

To quantify the textual characteristics of messages exchanged during a chat, we construct three textual measures adapted from Read (2000): lexical density, lexical clarity, and lexical diversity. Each measure is computed separately for agents and customers. *Lexical density is defined as the ratio of content words (such as nouns, verbs, adjectives) to the total* number of words in a message, capturing the informational richness of the communication. Lexical clarity is measured by the average number of Chinese characters per message, reflecting the degree to which a message is elaborate. Lexical diversity refers to entropy, calculated as −∑# log!#, where # represents the frequency of each content word. Higher entropy values indicate greater variation in word usage, and thus more diverse language production.

## C3. Agent-Customer Message Ratio Across Chat Stages

To measure the relative intensity of agent-customer communication, we construct the agent-customer *message ratio, defined as the number of agent messages divided by the number of customer messages. This* measure serves as a proxy for the agent’s contribution to the conversation. To capture how communication intensity evolves throughout an interaction, we compute this ratio both for the entire chat and separately across distinct stages of the interaction. In our setting, all chats were resolved using standardized operating procedures (SOPs). An SOP is a structured decision tree that guides agents through the service process. For each common customer issue, the firm specifies a sequence of decision points linked to predefined responses and solutions. Agents access SOPs by entering keywords and then follow the prescribed decision path after diagnosing the customer’s issue. Using the start and end times of the SOP, we divide each chat into three sequential stages: (1) issue *identification and solution proposal, (2) resolution, and (3) confirmation. This structure enables us to* compute the message ratio at both the aggregate and stage-specific levels, providing a dynamic view of agent contribution over the course of the chat. Figure A11 illustrates this process. The issue identification and solution proposal stage spans from the start of the chat until the first SOP message (e.g., from “Hello, you are connected to …” to “Yes, please.”). The resolution stage consists of one SOP-guided message (“I have urged … within 2 hours.”), while the confirmation stage includes the remaining messages in which the agent reconfirms issue resolution.

## C4. Agent Task-Switching Measures

To examine agents’ task-switching behavior, we construct three measures: active time, shift-away time, and *share of shift-away time. Active time captures the cumulative duration during which an agent actively* engages with the focal chat (i.e., not attending to other concurrent chats). Shift-away time captures the cumulative duration during which the agent is disengaged from the focal chat and is calculated as the difference between total chat duration and active time. Share of shift-away time represents the proportion of time the agent spends away from the focal chat, calculated as shift-away time divided by chat duration. **Figure A12. Illustration of Agent Task -Switching for a Hypothetical Chat Session**

Figure A12 illustrates the calculation of these measures using a hypothetical chat session in which the agent manages two chats simultaneously. Based on overlapping message timelines, the first shift-away occurs after the agent sends the message “Would you…for you?” (9:01:00), followed by a message in another chat. The second shift-away occurs after the message “Anything else I can help you with?” (9:08:30), again followed by activity in another session. The two active periods for the focal chat span from

---

9:00:30 to 9:01:00 and from 9:05:00 to 9:08:30, yielding a total active time of four minutes. Given a total chat duration of nine minutes, the agent spends five minutes away from the focal chat. The resulting share of shift-away time is 5/9, or 0.56.

## Appendix D. Text Embedding Analysis of Agent Messages

We conduct a text embedding analysis to investigate the impact of the gen AI assistant on agents’ language patterns. Specifically, we utilize the shibing624/text2vec-base-chinese model, a widely used state-of-the- art LLM for Chinese, to create text embeddings. 12 Text embeddings convert unstructured text into structured, high-dimensional vectors that capture semantic meaning. Semantically similar texts yield similar vectors and are positioned closer together in the embedding space. We then measure message similarity by calculating the cosine similarity between vectors. This measure ranges from 0 to 1, with values closer to 0 indicating dissimilarity and values closer to 1 indicating high similarity. For treated agents, we calculate cross-agent message similarity between the lowest (Q1) and highest (Q5) performance quintiles in the treatment group, using the partitions reported in Table 8. For each week of the experiment, we categorize agent messages based on whether the sender belongs to Q1 or Q5, and compute the cosine similarity between the two groups’ messages. This results in a weekly average similarity score. We focus on messages exchanged during the issue identification stage of each chat, as this is the phase where agents are most likely to have used gen AI-suggested messages. Figure A10 illustrates the weekly cross-agent similarity scores. During the pretreatment weeks, the similarity between low and high performers remained relatively stable, averaging 0.610. Because agents had no access to the gen AI assistant during this phase, all chats were included in the calculation. During the treatment period, however, message similarity between low and high performers diverged across three categories of chats: (1) no gen AI usage, (2) partial adherence, and (3) complete adherence. Chats with no gen AI usage had the lowest similarity (average score = 0.600), chats with partial adherence showed higher similarity (average score = 0.699, a 14.6% increase relative to pretreatment), and chats with complete adherence had the highest similarity (average score = 0.765, a 25.4% increase relative to pretreatment).

## Appendix E. Online Survey Results

Alibaba internally conducted an online survey five months after the experiment to assess treated agents’ perceptions of the gen AI assistant. The survey was distributed via the enterprise collaboration platform Ali *Ding and was fully anonymous to encourage candid responses. A total of 834 valid responses were collected.* The survey consisted of two parts: Part A focused on agents’ experiences with the gen AI assistant, and Part B collected agents’ self-assessments of their performance.

[https://huggingface.co/shibing624/text2vec-base-chinese](https://huggingface.co/shibing624/text2vec-base-chinese)

---

Based on Part B, 63.4% of respondents had worked for less than one year, 17.5% for one to two years, and 19.1% for more than two years. Agents’ skill level was proxied by their performance rank, ranging from one (lowest) to five (highest), which positively correlates with pretreatment service performance. As shown in Table A13, self-assessed performance generally increases with rank, with slight deviation at level one due to the small sample size. Among all respondents, 20 agents were ranked level one, 171 level two, 314 level three, 236 level four, and 93 level five. In the following analysis, we focus on high performers (level 5 agents) and low performers (levels 1 and 2) 13 . In Part A, agents were first asked, “How frequently do you follow the gen AI assistant’s suggestions?” Among respondents, 47.1% selected Sometimes follow, 41.6% Often follow, 6.7% Never follow, and 4.6% Always follow. These responses broadly align with the average gen AI usage rate of 28.7% observed during the experiment and the presence of both “always-followers” and “never-takers” throughout the experimental period. Next, agents were asked, “Under what conditions do you tend to follow the gen AI assistant?” with four possible options: (1) during peak hours or periods of high workload, (2) when workload is relatively light, (3) when handling complex cases requiring customer history review, and (4) when dealing with simple cases. The most frequently selected condition was “during peak hours or periods of high workload” (66.9%), followed by “when handling complex cases” (52.4%). A smaller share of respondents selected “when workload is relatively light” (8.8%) or “when dealing with simple cases” (28.2%). Agents were also asked to rate several statements about their experience with the gen AI assistant on a five-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree). The detailed distributions by performance level are presented in Tables A11 and A12. For perceived suggestion quality (A1), high performers reported a lower mean score (3.72) than low performers (3.83). A similar pattern emerged for perceived helpfulness (A2): 71.2% of low performers agreed that the gen AI assistant was helpful, compared with 62.4% of high performers. Regarding specific performance measures, low performers reported greater perceived improvements than high performers in both service speed (77.5% vs. 67.7%) and service quality (66.5% vs. 61.3%). Across all respondents, the assistant was viewed as more effective in improving service speed than quality. Among the detailed benefits (A5–A11), responsiveness (A8) received the highest average rating, suggesting that agents found the gen AI assistant most useful for accelerating replies. Case summarization (A6) ranked second. For all gen AI’s benefits, high performers consistently provided lower ratings than low performers.

All observations continue to hold if we include both level 4 and 5 agents in the high-performer group.

---

The final question, “Do you have any suggestions or comments on the gen AI assistant?”, was open-

The final question, “Do you have any suggestions or comments on the gen AI assistant?”, was openended. Among the 35 high performers who provided non-empty responses, 51% expressed concerns

regarding accuracy,  while 26% offered suggestions for improvement. These  qualitative  comments  are 
consistent with the quantitative results: high performers generally used the gen AI assistant with greater

regarding accuracy,  while 26% offered suggestions for improvement. These  qualitative  comments  are 
consistent with the quantitative results: high performers generally used the gen AI assistant with greater

consistent with the quantitative results: high performers generally used the gen AI assistant with greater

consistent with the quantitative results: high performers generally used the gen AI assistant with greater 
caution, frequently verifying its outputs before use, which likely contributed to their lower adoption rate of 
the tool.

consistent with the quantitative results: high performers generally used the gen AI assistant with greater 
caution, frequently verifying its outputs before use, which likely contributed to their lower adoption rate of

Table  A11:  Survey Responses of  High-Performing Agents on Their Experience with the Gen AI 
Assistant

| Do you agree with the following statements? Please indicate how much you agree or disagree with the following statements. |  | Strongly Disagree | Disagree | Neutral | Agree | Strongly Agree |
| --- | --- | --- | --- | --- | --- | --- |
| No. | Statement |  |  |  |  |  |
| A1 | The quality of suggestions generated by the gen AI assistant is good. | 2.2% | 7.5% | 30.1% | 36.6% | 23.7% |
| A2 | The gen AI suggestions are helpful to my work. | 4.3% | 6.5% | 26.9% | 25.8% | 36.6% |
| A3 | The gen AI suggestions help me improve my service speed. | 5.4% | 3.2% | 23.7% | 24.7% | 43.0% |
| A4 | The gen AI suggestions help me improve my service quality. | 5.4% | 10.8% | 22.6% | 26.9% | 34.4% |
| A5 | The gen AI suggestions help me find solutions more quickly. | 4.3% | 3.2% | 26.9% | 25.8% | 39.8% |
| A6 | The gen AI suggestions help me understand customer cases more effectively. | 2.2% | 3.2% | 19.4% | 33.3% | 41.9% |
| A7 | The gen AI suggestions allow me to focus more on the customer experience. | 6.5% | 5.4% | 18.3% | 28.0% | 41.9% |
| A8 | The gen AI suggestions help me respond to customers faster. | 3.2% | 2.2% | 17.2% | 26.9% | 50.5% |
| A9 | The gen AI suggestions help me communicate and interact better with customers. | 5.4% | 5.4% | 22.6% | 24.7% | 41.9% |
| A10 | The gen AI suggestions make my work easier. | 6.5% | 4.3% | 22.6% | 24.7% | 41.9% |
| A11 | The gen AI suggestions make me more motivated to participate in work. | 8.6% | 3.2% | 26.9% | 17.2% | 44.1% |

!"#$% A-.2RA&D9N(AR.?CRA&.(A82R&T290&2?*A?4AD*RC(TRA4T?)Ac?A.2S.AB(T4?T)(TR#Ak(RB?*8(*&RATD&(8A(Df.AR&D&()(*&A?*ADA>lB?2*&Am2a(T&ARfDN(AnIAoA%&T?*SNPA
h2RDST((pA>AoA%&T?*SNPA+ST((q#A

Table  A12:  Survey Responses of  Low-Performing Agents on Their Experience with the Gen AI 
Assistant

| Do you agree with the following statements? Please indicate how much you agree or disagree with the following statements. |  | Strongly Disagree | Disagree | Neutral | Agree | Strongly Agree |
| --- | --- | --- | --- | --- | --- | --- |
| No. | Statement |  |  |  |  |  |
| A1 | The quality of suggestions generated by the gen AI assistant is good. | 2.6% | 4.2% | 29.3% | 35.6% | 28.3% |
| A2 | The gen AI suggestions are helpful to my work. | 2.1% | 3.1% | 23.6% | 32.5% | 38.7% |
| A3 | The gen AI suggestions help me improve my service speed. | 1.6% | 3.1% | 17.8% | 27.7% | 49.7% |
| A4 | The gen AI suggestions help me improve my service quality. | 2.1% | 8.4% | 23.0% | 29.3% | 37.2% |
| A5 | The gen AI suggestions help me find solutions more quickly. | 3.1% | 7.3% | 19.4% | 27.7% | 42.4% |
| A6 | The gen AI suggestions help me understand customer cases more effectively. | 1.6% | 4.7% | 17.8% | 30.9% | 45.0% |
| A7 | The gen AI suggestions allow me to focus more on the customer experience. | 3.1% | 4.7% | 18.8% | 29.3% | 44.0% |
| A8 | The gen AI suggestions help me respond to customers faster. | 1.6% | 3.7% | 16.2% | 27.7% | 50.8% |
| A9 | The gen AI suggestions help me communicate and interact better with customers. | 2.1% | 6.8% | 21.5% | 28.3% | 41.4% |
| A10 | The gen AI suggestions make my work easier. | 3.7% | 6.8% | 23.6% | 24.6% | 41.4% |
| A11 | The gen AI suggestions make me more motivated to participate in work. | 2.1% | 8.9% | 18.3% | 28.3% | 42.4% |

---

Table A13: Self-Evaluation Scores by Agent Performance Rank

| Do you agree with the following statements? Please indicate how much you agree or disagree with the following statements. |  | Mean Score |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |
| No. | Statement | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
| B1 | I can easily understand what customers really mean during service interactions. | 4.15 | 4.22 | 4.34 | 4.36 | 4.45 |
| B2 | I can easily relate to and understand how customers feel. | 4.55 | 4.35 | 4.43 | 4.47 | 4.51 |
| B3 | I can quickly review and extract key customer information from the working interface. | 4.20 | 4.17 | 4.30 | 4.40 | 4.66 |
| B4 | I can quickly identify the customer&#x27;s issue. | 4.25 | 4.13 | 4.38 | 4.43 | 4.67 |
| B5 | Once I identify a customer&#x27;s issue, I can quickly find an appropriate solution. | 4.25 | 4.08 | 4.29 | 4.42 | 4.51 |
| B6 | I can complete my service tasks efficiently and with ease. | 4.10 | 3.98 | 4.14 | 4.13 | 4.47 |

!"#$% AM(Sg?*:(*&SA;D&(:A(DR=AS&D&()(*&A?*ADAOkg?7*&A+7C(;&ASRD-(Al.AmAB&;?*>-8An7SD>;((fAOAmAB&;?*>-8Ao>;((p#