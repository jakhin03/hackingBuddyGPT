# Using Google Gemini Models with HackingBuddyGPT

HackingBuddyGPT now supports Google Gemini models as an alternative to OpenAI models. This guide explains how to configure and use Gemini models.

## Prerequisites

1. Get a Google AI API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Install the additional dependencies:
   ```bash
   pip install google-generativeai
   ```
   Or if using the RAG features:
   ```bash
   pip install -e ".[rag-usecase]"
   ```

## Configuration

### Basic Gemini Configuration

Copy `.env.gemini.example` to `.env` or modify your existing `.env` file:

```bash
# Use your Gemini API key instead of OpenAI
llm.api_key='your-gemini-api-key'

# Choose a Gemini model
llm.model='gemini-1.5-flash'  # or 'gemini-pro', 'gemini-1.5-pro'

# Set appropriate context size
llm.context_size=1048576  # 1M tokens for gemini-1.5-flash
```

### Available Gemini Models

| Model Name | Context Size | Description |
|------------|--------------|-------------|
| `gemini-pro` | 30,720 tokens | Original Gemini Pro model |
| `gemini-1.5-pro` | 2,097,152 tokens | Latest Pro model with 2M token context |
| `gemini-1.5-flash` | 1,048,576 tokens | Faster model with 1M token context |

### RAG with Gemini Embeddings

If you're using the RAG (Retrieval-Augmented Generation) features, you can also use Gemini for embeddings:

```bash
# RAG configuration
rag_embedding_provider = "gemini"
rag_embedding = "models/embedding-001"
gemini_api_key = 'your-gemini-api-key'
```

Alternatively, you can mix providers - use Gemini for the main LLM and OpenAI for embeddings:

```bash
# Use Gemini for main LLM
llm.api_key='your-gemini-api-key'
llm.model='gemini-1.5-flash'

# Use OpenAI for embeddings
rag_embedding_provider = "openai"
rag_embedding = "text-embedding-3-small"
openai_api_key = 'your-openai-key'
```

## Usage

Once configured, HackingBuddyGPT will automatically use the Gemini models just like OpenAI models. All existing functionality and use cases work the same way.

### Example Usage

```bash
# Run with Gemini configuration
python -m hackingBuddyGPT.cli.wintermute --config your_gemini_config.env
```

## Cost Considerations

Gemini models generally offer competitive pricing compared to OpenAI models:

- **Gemini 1.5 Flash**: Optimized for speed and cost-effectiveness
- **Gemini 1.5 Pro**: Best for complex reasoning tasks with large context
- **Gemini Pro**: Balanced option for general use

Check [Google AI pricing](https://ai.google.dev/pricing) for current rates.

## Troubleshooting

### Common Issues

1. **API Key Issues**: Make sure your Gemini API key is valid and has proper permissions
2. **Model Not Found**: Ensure you're using the correct model name (case-sensitive)
3. **Rate Limits**: Gemini has different rate limits than OpenAI - the tool will automatically retry with backoff

### Getting Help

If you encounter issues:
1. Check your API key and quotas in [Google AI Studio](https://makersuite.google.com/)
2. Verify your model names match the supported list above
3. Check the logs for detailed error messages

## Migration from OpenAI

To migrate from OpenAI to Gemini:

1. Get a Gemini API key
2. Update your `.env` file with Gemini configuration
3. Choose an appropriate Gemini model based on your needs
4. Update context size if needed
5. Test with a simple use case first

The rest of your HackingBuddyGPT workflows should work unchanged!
